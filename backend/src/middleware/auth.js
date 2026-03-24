const { clerkMiddleware, getAuth } = require('@clerk/express');
const { pool } = require('../db/init');

const clerkAuth = clerkMiddleware();

async function syncToBrevo(user) {
  const res = await fetch('https://api.brevo.com/v3/contacts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      email: user.email,
      attributes: {
        FIRSTNAME: user.name?.split(' ')[0] || '',
        LASTNAME: user.name?.split(' ').slice(1).join(' ') || '',
        ROLE: 'admin',
        PLAN: 'free',
        APP: 'Gridiron Stats',
      },
      listIds: [2],
      updateEnabled: false,
    }),
  });
  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    console.error('Brevo sync failed:', err);
  }
}

async function requireAuth(req, res, next) {
  try {
    const auth = getAuth(req);
    if (!auth?.userId) {
      return res.status(401).json({ error: 'Unauthorised' });
    }

    const result = await pool.query(
      `INSERT INTO users (auth0_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth0_id) DO UPDATE
         SET email = EXCLUDED.email,
             name = EXCLUDED.name,
             picture = EXCLUDED.picture
       RETURNING *`,
      [
        auth.userId,
        auth.sessionClaims?.email || '',
        auth.sessionClaims?.name || auth.sessionClaims?.username || '',
        auth.sessionClaims?.image_url || '',
      ]
    );

    req.dbUser = result.rows[0];

    // Sync new users to Brevo
    if (result.rows[0] && process.env.BREVO_API_KEY) {
      const isNewUser = result.rows[0].created_at && 
        (new Date() - new Date(result.rows[0].created_at)) < 5000;
      if (isNewUser) {
        syncToBrevo(result.rows[0]).catch(err => console.error('Brevo sync error:', err));
      }
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { clerkAuth, requireAuth };