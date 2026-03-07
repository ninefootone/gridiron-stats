const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

// GET /api/stats?game_id=X — all stats for a game with player info
router.get('/', requireAuth, async (req, res, next) => {
  const { game_id, player_id } = req.query;
  try {
    let query, params;
    if (game_id) {
      query = `
        SELECT ps.*, p.name AS player_name, p.number AS player_number, p.position AS player_position,
               u.name AS logged_by_name
        FROM player_stats ps
        JOIN players p ON p.id = ps.player_id
        LEFT JOIN users u ON u.id = ps.logged_by
        WHERE ps.game_id = $1
        ORDER BY ps.logged_at DESC`;
      params = [game_id];
    } else if (player_id) {
      query = `
        SELECT ps.*, g.opponent_name, g.game_date
        FROM player_stats ps
        JOIN games g ON g.id = ps.game_id
        WHERE ps.player_id = $1
        ORDER BY g.game_date DESC, ps.logged_at DESC`;
      params = [player_id];
    } else {
      return res.status(400).json({ error: 'game_id or player_id required' });
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/stats/summary?team_id=X — season leaderboard
router.get('/summary', requireAuth, async (req, res, next) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.number, p.position,
              ps.stat_type, SUM(ps.value) AS total
       FROM players p
       JOIN player_stats ps ON ps.player_id = p.id
       WHERE p.team_id = $1
       GROUP BY p.id, p.name, p.number, p.position, ps.stat_type
       ORDER BY p.name, ps.stat_type`,
      [team_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/stats — log a stat
router.post('/', requireAuth, async (req, res, next) => {
  const { game_id, player_id, stat_type, value, notes } = req.body;
  if (!game_id || !player_id || !stat_type) {
    return res.status(400).json({ error: 'game_id, player_id and stat_type required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO player_stats (game_id, player_id, stat_type, value, notes, logged_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [game_id, player_id, stat_type, value ?? 1, notes || null, req.dbUser.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/stats/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM player_stats WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
