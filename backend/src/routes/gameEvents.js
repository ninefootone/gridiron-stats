const express = require('express');
const { requireAuth, requireGameAccess } = require('../middleware/auth');
const { pool } = require('../db/init');
const router = express.Router();

// GET /api/game-events?game_id=X
router.get('/', requireAuth, requireGameAccess, async (req, res, next) => {
  const { game_id } = req.query;
  if (!game_id) return res.status(400).json({ error: 'game_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM game_events WHERE game_id = $1 ORDER BY logged_at DESC`,
      [game_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/game-events
router.post('/', requireAuth, requireGameAccess, async (req, res, next) => {
  const { game_id, event_type } = req.body;
  const validTypes = ['end_half', 'end_regulation', 'start_ot', 'turnover_on_downs'];
  if (!game_id || !event_type) return res.status(400).json({ error: 'game_id and event_type required' });
  if (!validTypes.includes(event_type)) return res.status(400).json({ error: 'Invalid event_type' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO game_events (game_id, event_type) VALUES ($1, $2) RETURNING *`,
      [game_id, event_type]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/game-events/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM game_events
       WHERE id = $1
         AND game_id IN (
           SELECT g.id FROM games g
           WHERE g.team_id IN (SELECT id FROM teams WHERE created_by = $2)
              OR g.team_id IN (SELECT team_id FROM team_members WHERE user_id = $2)
         )`,
      [req.params.id, req.dbUser.id]
    );
    if (!rowCount) return res.status(403).json({ error: 'Not authorised' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;