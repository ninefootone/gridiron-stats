const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');
const router = express.Router();

const SCORE_VALUES = {
  touchdown: 6,
  one_xp: 1,
  two_xp: 2,
  safety: 2,
  field_goal: 3,
};

// GET /api/opponent-stats?game_id=X
router.get('/', requireAuth, async (req, res, next) => {
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

// POST /api/opponent-stats
router.post('/', requireAuth, async (req, res, next) => {
  const { game_id, stat_type } = req.body;
  if (!game_id || !stat_type) return res.status(400).json({ error: 'game_id and stat_type required' });
  const value = SCORE_VALUES[stat_type];
  if (value === undefined) return res.status(400).json({ error: 'Invalid stat_type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO opponent_stats (game_id, stat_type, value) VALUES ($1, $2, $3) RETURNING *`,
      [game_id, stat_type, value]
    );
    // Recalculate opponent score
    const { rows: totals } = await pool.query(
      `SELECT COALESCE(SUM(value), 0) AS total FROM opponent_stats WHERE game_id = $1`,
      [game_id]
    );
    await pool.query(
      `UPDATE games SET opponent_score = $1 WHERE id = $2`,
      [totals[0].total, game_id]
    );
    res.status(201).json({ stat: rows[0], opponent_score: Number(totals[0].total) });
  } catch (err) { next(err); }
});

// DELETE /api/opponent-stats/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM opponent_stats WHERE id = $1 RETURNING game_id`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const game_id = rows[0].game_id;
    // Recalculate opponent score
    const { rows: totals } = await pool.query(
      `SELECT COALESCE(SUM(value), 0) AS total FROM opponent_stats WHERE game_id = $1`,
      [game_id]
    );
    await pool.query(
      `UPDATE games SET opponent_score = $1 WHERE id = $2`,
      [totals[0].total, game_id]
    );
    res.json({ success: true, opponent_score: Number(totals[0].total) });
  } catch (err) { next(err); }
});

module.exports = router;