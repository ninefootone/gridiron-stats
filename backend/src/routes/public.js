const express = require('express');
const { pool } = require('../db/init');
const router = express.Router();

// GET /api/public/games/:id
router.get('/games/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, opponent_name, game_date, game_time, home_away,
              our_score, opponent_score, game_type, location, game_status, whistle_game_id
       FROM games WHERE id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/public/stats?game_id=X
router.get('/stats', async (req, res, next) => {
  const { game_id } = req.query;
  if (!game_id) return res.status(400).json({ error: 'game_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT ps.id, ps.stat_type, ps.value, ps.notes, ps.logged_at, ps.game_id,
              p.name AS player_name, p.number AS player_number
       FROM player_stats ps
       JOIN players p ON p.id = ps.player_id
       WHERE ps.game_id = $1
       ORDER BY ps.logged_at DESC`,
      [game_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/opponent-stats?game_id=X
router.get('/opponent-stats', async (req, res, next) => {
  const { game_id } = req.query;
  if (!game_id) return res.status(400).json({ error: 'game_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM opponent_stats WHERE game_id = $1 ORDER BY logged_at DESC`,
      [game_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/stats-summary — public platform stats for marketing site
router.get('/stats-summary', async (req, res, next) => {
  try {
    const [users, teams, players, games] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM teams'),
      pool.query('SELECT COUNT(*) FROM players WHERE active = true'),
      pool.query('SELECT COUNT(*) FROM games'),
    ]);
    res.json({
      coaches: Number(users.rows[0].count),
      teams: Number(teams.rows[0].count),
      players: Number(players.rows[0].count),
      games: Number(games.rows[0].count),
    });
  } catch (err) { next(err); }
});

module.exports = router;