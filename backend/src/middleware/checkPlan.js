const { pool } = require('../db/init');

async function getUserPlan(userId) {
  const { rows } = await pool.query(
    `SELECT plan FROM subscriptions WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.plan || 'free';
}

async function checkTeamLimit(req, res, next) {
  try {
    const plan = await getUserPlan(req.dbUser.id);
    if (plan === 'club' || plan === 'individual') return next();

    // Free plan — max 1 team
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM teams WHERE created_by = $1`,
      [req.dbUser.id]
    );
    if (Number(rows[0].count) >= 1) {
      return res.status(403).json({ 
        error: 'Free plan limit reached',
        limit: 'teams',
        upgrade_required: true,
      });
    }
    next();
  } catch (err) { next(err); }
}

async function checkGameLimit(req, res, next) {
  try {
    const plan = await getUserPlan(req.dbUser.id);
    if (plan === 'club' || plan === 'individual') return next();

    // Free plan — max 3 games total across all teams
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM games g
       JOIN teams t ON t.id = g.team_id
       WHERE t.created_by = $1`,
      [req.dbUser.id]
    );
    if (Number(rows[0].count) >= 3) {
      return res.status(403).json({
        error: 'Free plan limit reached',
        limit: 'games',
        upgrade_required: true,
      });
    }
    next();
  } catch (err) { next(err); }
}

module.exports = { checkTeamLimit, checkGameLimit, getUserPlan };
