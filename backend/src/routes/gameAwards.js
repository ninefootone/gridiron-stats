const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');
const router = express.Router();

const VALID_TYPES = ['mvp_offense', 'mvp_defense', 'coaches_award', 'honourable_mention'];
const SINGLE_WINNER_TYPES = ['mvp_offense', 'mvp_defense', 'coaches_award'];

// GET /api/game-awards?game_id=X
router.get('/', requireAuth, async (req, res, next) => {
  const { game_id } = req.query;
  if (!game_id) return res.status(400).json({ error: 'game_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT ga.*, p.name AS player_name, p.number AS player_number
       FROM game_awards ga
       JOIN players p ON p.id = ga.player_id
       WHERE ga.game_id = $1
       ORDER BY ga.logged_at ASC`,
      [game_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/game-awards
router.post('/', requireAuth, async (req, res, next) => {
  const { game_id, player_id, award_type, notes } = req.body;
  if (!game_id || !player_id || !award_type) {
    return res.status(400).json({ error: 'game_id, player_id and award_type required' });
  }
  if (!VALID_TYPES.includes(award_type)) {
    return res.status(400).json({ error: 'Invalid award_type' });
  }
  try {
    let rows;
    if (SINGLE_WINNER_TYPES.includes(award_type)) {
      // Upsert — replace existing winner for this award type
      ({ rows } = await pool.query(
        `INSERT INTO game_awards (game_id, player_id, award_type, notes, logged_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (game_id, award_type) WHERE award_type IN ('mvp_offense', 'mvp_defense', 'coaches_award')
         DO UPDATE SET player_id = EXCLUDED.player_id, notes = EXCLUDED.notes, logged_by = EXCLUDED.logged_by, logged_at = NOW()
         RETURNING *`,
        [game_id, player_id, award_type, notes || null, req.dbUser.id]
      ));
    } else {
      // Honourable mention — plain insert, multiple allowed
      ({ rows } = await pool.query(
        `INSERT INTO game_awards (game_id, player_id, award_type, notes, logged_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [game_id, player_id, award_type, notes || null, req.dbUser.id]
      ));
    }
    // Return with player details joined
    const { rows: full } = await pool.query(
      `SELECT ga.*, p.name AS player_name, p.number AS player_number
       FROM game_awards ga JOIN players p ON p.id = ga.player_id
       WHERE ga.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) { next(err); }
});

// PATCH /api/game-awards/:id — update notes only
router.patch('/:id', requireAuth, async (req, res, next) => {
  const { notes } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE game_awards SET notes = $1 WHERE id = $2 RETURNING *`,
      [notes || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Award not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/game-awards/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM game_awards WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;