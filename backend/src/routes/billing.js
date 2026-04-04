const express = require('express');
const Stripe = require('stripe');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  individual_monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY,
  individual_annual: process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL,
  club_monthly: process.env.STRIPE_PRICE_CLUB_MONTHLY,
  club_annual: process.env.STRIPE_PRICE_CLUB_ANNUAL,
};

// Get current subscription
router.get('/subscription', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM subscriptions WHERE user_id = $1',
      [req.dbUser.id]
    );
    res.json(rows[0] || { plan: 'free', status: 'active' });
  } catch (err) { next(err); }
});

// Create checkout session
router.post('/checkout', requireAuth, async (req, res, next) => {
  const { price_key, promo_code } = req.body;
  const price_id = PRICES[price_key];
  if (!price_id) return res.status(400).json({ error: 'Invalid price' });

  try {
    // Get or create Stripe customer
    let { rows } = await pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.dbUser.id]
    );
    
    let customerId = rows[0]?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: req.dbUser.email,
        name: req.dbUser.name,
        metadata: { user_id: req.dbUser.id },
      });
      customerId = customer.id;
    }

    const sessionParams = {
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/teams?upgraded=true`,
      cancel_url: `${process.env.FRONTEND_URL}/teams?upgrade=cancelled`,
      metadata: { user_id: req.dbUser.id },
      allow_promotion_codes: true,
    };

    if (promo_code) {
      try {
        const codes = await stripe.promotionCodes.list({ code: promo_code, active: true });
        if (codes.data.length > 0) {
          sessionParams.discounts = [{ promotion_code: codes.data[0].id }];
          delete sessionParams.allow_promotion_codes;
        }
      } catch (e) { /* ignore invalid promo codes */ }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// Create customer portal session
router.post('/portal', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1',
      [req.dbUser.id]
    );
    if (!rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: rows[0].stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL}/teams`,
    });
    res.json({ url: session.url });
  } catch (err) { next(err); }
});

// Webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);    
        const plan = getPlanFromPrice(subscription.items.data[0].price.id);
        
        await pool.query(`
          INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, plan, status, current_period_end)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (stripe_customer_id) DO UPDATE SET
            stripe_subscription_id = $3,
            plan = $4,
            status = $5,
            current_period_end = $6,
            updated_at = NOW()
        `, [
          session.metadata.user_id,
          session.customer,
          subscription.id,
          plan,
          subscription.status,
          subscription.items?.data?.[0]?.current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000) : null,
        ]);
        await applyPlanRestrictions(session.metadata.user_id, plan);
        const { rows: checkoutUserRows } = await pool.query(`SELECT email FROM users WHERE id = $1`, [session.metadata.user_id]);
        if (checkoutUserRows[0]) await syncPlanToBrevo(checkoutUserRows[0].email, plan);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const plan = getPlanFromPrice(subscription.items.data[0].price.id);
                await pool.query(`
          UPDATE subscriptions SET
            plan = $1, status = $2,
            current_period_end = $3,
            cancel_at_period_end = $4,
            updated_at = NOW()
          WHERE stripe_subscription_id = $5
        `, [
          plan,
          subscription.status,
          subscription.items?.data?.[0]?.current_period_end ? new Date(subscription.items.data[0].current_period_end * 1000) : null,
          subscription.cancel_at_period_end || !!subscription.cancel_at,
          subscription.id,
        ]);

        // Apply restrictions based on new plan
        const { rows: subRows } = await pool.query(
          `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
        if (subRows[0]) {
          await applyPlanRestrictions(subRows[0].user_id, plan);
          const { rows: userRows } = await pool.query(`SELECT email FROM users WHERE id = $1`, [subRows[0].user_id]);
          if (userRows[0]) await syncPlanToBrevo(userRows[0].email, plan);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { rows: delSubRows } = await pool.query(
          `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1`,
          [subscription.id]
        );
        await pool.query(`
          UPDATE subscriptions SET plan = 'free', status = 'cancelled', updated_at = NOW()
          WHERE stripe_subscription_id = $1
        `, [subscription.id]);
        if (delSubRows[0]) {
          await applyPlanRestrictions(delSubRows[0].user_id, 'free');
          const { rows: delUserRows } = await pool.query(`SELECT email FROM users WHERE id = $1`, [delSubRows[0].user_id]);
          if (delUserRows[0]) await syncPlanToBrevo(delUserRows[0].email, 'free');
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

async function applyPlanRestrictions(userId, plan) {
  // Get all teams created by this user, oldest first
  const { rows: teams } = await pool.query(
    `SELECT id FROM teams WHERE created_by = $1 ORDER BY id ASC`,
    [userId]
  );

  if (!teams.length) return;

  const allowedTeams = plan === 'club' ? Infinity : 1;

  for (let i = 0; i < teams.length; i++) {
    const restricted = i >= allowedTeams;
    await pool.query(
      `UPDATE teams SET restricted = $1 WHERE id = $2`,
      [restricted, teams[i].id]
    );
  }
}

function getPlanFromPrice(priceId) {
  if (priceId === process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY || priceId === process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL) return 'individual';
  if (priceId === process.env.STRIPE_PRICE_CLUB_MONTHLY || priceId === process.env.STRIPE_PRICE_CLUB_ANNUAL) return 'club';
  return 'free';
}

async function syncPlanToBrevo(email, plan) {
  if (!process.env.BREVO_API_KEY || !email) return;
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        email,
        attributes: { PLAN: plan },
        listIds: [2],
        updateEnabled: true,
      }),
    });
  } catch (e) {
    console.error('Brevo plan sync failed:', e);
  }
}

module.exports = router;
