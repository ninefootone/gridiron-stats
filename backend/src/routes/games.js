const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');
const { broadcast } = require('../ws');
const { checkTeamRestricted } = require('../middleware/checkRestricted');

const router = express.Router();

// GET /api/games?team_id=X
router.get('/', requireAuth, async (req, res, next) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT g.*,
              (SELECT COUNT(*) FROM player_stats ps WHERE ps.game_id = g.id) AS stat_count
       FROM games g
       WHERE g.team_id = $1
       ORDER BY g.game_date DESC`,
      [team_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/games
const { checkGameLimit } = require('../middleware/checkPlan');
router.post('/', requireAuth, checkGameLimit, checkTeamRestricted, async (req, res, next) => {
  const { team_id, opponent_name, location, game_date, game_time, home_away, notes, game_type } = req.body;
  if (!team_id || !opponent_name || !game_date) {
    return res.status(400).json({ error: 'team_id, opponent_name and game_date required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO games (team_id, opponent_name, location, game_date, game_time, home_away, notes, game_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [team_id, opponent_name, location, game_date, game_time, home_away || 'home', notes, game_type || 'regular']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/games/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM games WHERE id = $1`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/games/:id
router.put('/:id', requireAuth, checkTeamRestricted, async (req, res, next) => {
  const { opponent_name, location, game_date, game_time, home_away, our_score, opponent_score, status, notes, game_type, whistle_game_id } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE games SET
         opponent_name = COALESCE($1, opponent_name),
         location = $2,
         game_date = COALESCE($3, game_date),
         game_time = $4,
         home_away = COALESCE($5, home_away),
         our_score = COALESCE($6, our_score),
         opponent_score = COALESCE($7, opponent_score),
         status = COALESCE($8, status),
         notes = $9,
         game_type = COALESCE($10, game_type),
         whistle_game_id = COALESCE($11, whistle_game_id)
       WHERE id = $12 RETURNING *`,
      [opponent_name, location, game_date, game_time, home_away, our_score, opponent_score, status, notes, game_type, whistle_game_id || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/games/:id
router.delete('/:id', requireAuth, checkTeamRestricted, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM games WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/games/:id/status
router.patch('/:id/status', requireAuth, async (req, res, next) => {
  const { status } = req.body;
  if (!['scheduled', 'active', 'ended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE games SET game_status = $1 WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Game not found' });
    broadcast(String(req.params.id), { type: 'game_status_changed', game_status: status });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
