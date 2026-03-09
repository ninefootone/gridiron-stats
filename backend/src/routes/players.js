const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

// GET /api/players?team_id=X
router.get('/', requireAuth, async (req, res, next) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT p.*,
              COALESCE(json_agg(json_build_object('stat_type', ps.stat_type, 'total', ps.total)) FILTER (WHERE ps.stat_type IS NOT NULL), '[]') AS season_totals
       FROM players p
       LEFT JOIN (
         SELECT player_id, stat_type, SUM(value) AS total
         FROM player_stats GROUP BY player_id, stat_type
       ) ps ON ps.player_id = p.id
       WHERE p.team_id = $1
       GROUP BY p.id
       ORDER BY p.number ASC NULLS LAST, p.name ASC`,
      [team_id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/players
router.post('/', requireAuth, async (req, res, next) => {
  const { team_id, name, number, position } = req.body;
  if (!team_id || !name) return res.status(400).json({ error: 'team_id and name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO players (team_id, name, number, position) VALUES ($1, $2, $3, $4) RETURNING *`,
      [team_id, name, number || null, position || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/players/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  const { name, number, position, active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE players SET
         name = COALESCE($1, name),
         number = COALESCE($2, number),
         position = COALESCE($3, position),
         active = COALESCE($4, active)
       WHERE id = $5 RETURNING *`,
      [name, number, position, active, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Player not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/players/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  const { name, number, position } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE players SET
        name = COALESCE($1, name),
        number = $2,
        position = COALESCE($3, position)
       WHERE id = $4
       AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $5 AND role IN ('admin','member'))
       RETURNING *`,
      [name, number ?? null, position, req.params.id, req.dbUser.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Player not found or not authorised' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/players/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM players WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
