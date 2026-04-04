const { pool } = require('../db/init');

async function getTeamId(req) {
  // Direct team_id in body or query
  if (req.body?.team_id) return req.body.team_id;
  if (req.query?.team_id) return req.query.team_id;

  // Look up team_id from player
  if (req.params?.id && req.baseUrl.includes('players')) {
    const { rows } = await pool.query('SELECT team_id FROM players WHERE id = $1', [req.params.id]);
    return rows[0]?.team_id;
  }

  // Look up team_id from game
  if (req.params?.id && req.baseUrl.includes('games')) {
    const { rows } = await pool.query('SELECT team_id FROM games WHERE id = $1', [req.params.id]);
    return rows[0]?.team_id;
  }

  // Look up team_id from play
  if (req.params?.id && req.baseUrl.includes('plays')) {
    const { rows } = await pool.query('SELECT team_id FROM plays WHERE id = $1', [req.params.id]);
    return rows[0]?.team_id;
  }

  // Look up team_id from stat (via game)
  if (req.body?.game_id) {
    const { rows } = await pool.query('SELECT team_id FROM games WHERE id = $1', [req.body.game_id]);
    return rows[0]?.team_id;
  }

  return null;
}

async function checkTeamRestricted(req, res, next) {
  try {
    const teamId = await getTeamId(req);
    if (!teamId) return next();

    const { rows } = await pool.query('SELECT restricted FROM teams WHERE id = $1', [teamId]);
    if (rows[0]?.restricted) {
      return res.status(403).json({
        error: 'This team is read-only. Upgrade your plan to make changes.',
        team_restricted: true,
      });
    }
    next();
  } catch (err) { next(err); }
}

module.exports = { checkTeamRestricted };