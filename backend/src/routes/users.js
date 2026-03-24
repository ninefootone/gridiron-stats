const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

// GET /api/users/me — returns or creates the current user
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(req.dbUser);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/admin/stats — superadmin only
router.get('/admin/stats', requireAuth, async (req, res, next) => {
  const ADMIN_IDS = ['user_3AiQe1YxmWYTooEO5Ix0HnmJ9Tx', 'user_3AgGD3kALzcbzzPc0PHGo2lwwr8'];
  if (!ADMIN_IDS.includes(req.dbUser.auth0_id)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [users, teamCount, teams, players, games, plays] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM teams'),
      pool.query(`SELECT t.*, u.name as creator_name,
                  (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
                  (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.active = true) as player_count,
                  (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id) as game_count
                  FROM teams t LEFT JOIN users u ON u.id = t.created_by
                  ORDER BY t.created_at DESC`),
      pool.query('SELECT COUNT(*) FROM players WHERE active = true'),
      pool.query('SELECT COUNT(*) FROM games'),
      pool.query('SELECT COUNT(*) FROM plays'),
    ]);
    res.json({
      stats: {
        users: Number(users.rows[0].count),
        teams: Number(teamCount.rows[0].count),
        players: Number(players.rows[0].count),
        games: Number(games.rows[0].count),
        plays: Number(plays.rows[0].count),
      },
      teams: teams.rows,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
