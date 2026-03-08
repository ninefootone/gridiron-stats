const { clerkMiddleware, getAuth } = require('@clerk/express');
const { pool } = require('../db/init');

const clerkAuth = clerkMiddleware();

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
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { clerkAuth, requireAuth };