const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');
const { recalculateOurScore } = require('../utils/scoring');
const router = express.Router();

// GET /api/score-adjustments?game_id=X
router.get('/', requireAuth, async (req, res, next) => {
  const { game_id } = req.query;
  if (!game_id) return res.status(400).json({ error: 'game_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT sa.*, u.name AS logged_by_name
       FROM score_adjustments sa
       LEFT JOIN users u ON u.id = sa.logged_by
       WHERE sa.game_id = $1
       ORDER BY sa.logged_at ASC`,
      [game_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/score-adjustments
router.post('/', requireAuth, async (req, res, next) => {
  const { game_id, team, adjustment, reason } = req.body;
  if (!game_id || !team || adjustment === undefined || !reason?.trim()) {
    return res.status(400).json({ error: 'game_id, team, adjustment and reason required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO score_adjustments (game_id, team, adjustment, reason, logged_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [game_id, team, adjustment, reason.trim(), req.dbUser.id]
    );
    // Recalculate our score if not locked
    const { rows: gameRows } = await pool.query(`SELECT score_locked, opponent_score FROM games WHERE id = $1`, [game_id]);
    let our_score = null;
    if (gameRows.length && !gameRows[0].score_locked) {
      our_score = await recalculateOurScore(pool, game_id);
    }
    // For opponent adjustments, update opponent_score directly
    let opponent_score = null;
    if (team === 'opponent') {
      const { rows: adjRows } = await pool.query(
        `SELECT COALESCE(SUM(adjustment), 0) AS total FROM score_adjustments WHERE game_id = $1 AND team = 'opponent'`,
        [game_id]
      );
      // Add to opponent stats total
      const { rows: oppRows } = await pool.query(
        `SELECT COALESCE(SUM(value), 0) AS total FROM opponent_stats WHERE game_id = $1`,
        [game_id]
      );
      opponent_score = Number(oppRows[0].total) + Number(adjRows[0].total);
      await pool.query(`UPDATE games SET opponent_score = $1 WHERE id = $2`, [Math.max(0, opponent_score), game_id]);
    }
    res.status(201).json({ adjustment: rows[0], our_score, opponent_score });
  } catch (err) { next(err); }
});

// DELETE /api/score-adjustments/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM score_adjustments WHERE id = $1 RETURNING game_id, team`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    const { game_id, team } = rows[0];
    const { rows: gameRows } = await pool.query(`SELECT score_locked FROM games WHERE id = $1`, [game_id]);
    let our_score = null;
    if (team === 'ours' && gameRows.length && !gameRows[0].score_locked) {
      our_score = await recalculateOurScore(pool, game_id);
    }
    let opponent_score = null;
    if (team === 'opponent') {
      const { rows: adjRows } = await pool.query(
        `SELECT COALESCE(SUM(adjustment), 0) AS total FROM score_adjustments WHERE game_id = $1 AND team = 'opponent'`,
        [game_id]
      );
      const { rows: oppRows } = await pool.query(
        `SELECT COALESCE(SUM(value), 0) AS total FROM opponent_stats WHERE game_id = $1`,
        [game_id]
      );
      opponent_score = Number(oppRows[0].total) + Number(adjRows[0].total);
      await pool.query(`UPDATE games SET opponent_score = $1 WHERE id = $2`, [Math.max(0, opponent_score), game_id]);
    }
    res.json({ success: true, our_score, opponent_score });
  } catch (err) { next(err); }
});

// PUT /api/score-adjustments/lock/:game_id — lock/unlock score
router.put('/lock/:game_id', requireAuth, async (req, res, next) => {
  const { score_locked } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE games SET score_locked = $1 WHERE id = $2 RETURNING *`,
      [score_locked, req.params.game_id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;