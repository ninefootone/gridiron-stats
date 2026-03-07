const { auth } = require('express-oauth2-jwt-bearer');
const { pool } = require('../db/init');

// Validates the JWT from Auth0
const checkJwt = auth({
  audience: process.env.AUTH0_AUDIENCE,
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
});

// Attaches db user record to req.user
async function attachUser(req, res, next) {
  try {
    const auth0Id = req.auth.payload.sub;
    const email = req.auth.payload[`${process.env.AUTH0_AUDIENCE}/email`] || req.auth.payload.email || '';
    const name = req.auth.payload[`${process.env.AUTH0_AUDIENCE}/name`] || req.auth.payload.name || '';
    const picture = req.auth.payload[`${process.env.AUTH0_AUDIENCE}/picture`] || req.auth.payload.picture || '';

    const result = await pool.query(
      `INSERT INTO users (auth0_id, email, name, picture)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (auth0_id) DO UPDATE
         SET email = EXCLUDED.email,
             name = EXCLUDED.name,
             picture = EXCLUDED.picture
       RETURNING *`,
      [auth0Id, email, name, picture]
    );

    req.dbUser = result.rows[0];
    next();
  } catch (err) {
    next(err);
  }
}

const requireAuth = [checkJwt, attachUser];

module.exports = { checkJwt, attachUser, requireAuth };
