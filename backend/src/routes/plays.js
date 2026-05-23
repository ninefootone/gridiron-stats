const express = require('express');
const { requireAuth, requireTeamAccess } = require('../middleware/auth');
const { pool } = require('../db/init');
const { checkTeamRestricted } = require('../middleware/checkRestricted');

const router = express.Router();

// Helper — check admin or coach role
async function requireAdminOrCoach(teamId, userId, res) {
  const { rows } = await pool.query(
    `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
    [teamId, userId]
  );
  if (!rows.length || !['admin', 'member'].includes(rows[0].role)) {
    res.status(403).json({ error: 'Admin or coach only' });
    return false;
  }
  return true;
}

// GET /api/plays?team_id=X
router.get('/', requireAuth, requireTeamAccess, async (req, res, next) => {
  const { team_id } = req.query;
  if (!team_id) return res.status(400).json({ error: 'team_id required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM plays WHERE team_id = $1 ORDER BY type ASC, name ASC`,
      [team_id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/plays
router.post('/', requireAuth, checkTeamRestricted, async (req, res, next) => {
  const { team_id, name, type, season, notes } = req.body;
  if (!team_id || !name || !type || !season) {
    return res.status(400).json({ error: 'team_id, name, type and season required' });
  }
  try {
    if (!await requireAdminOrCoach(team_id, req.dbUser.id, res)) return;
    const { rows } = await pool.query(
      `INSERT INTO plays (team_id, name, type, season, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [team_id, name, type, season, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/plays/:id
router.put('/:id', requireAuth, checkTeamRestricted, async (req, res, next) => {
  const { name, type, season, notes } = req.body;
  try {
    const existing = await pool.query(`SELECT * FROM plays WHERE id = $1`, [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Play not found' });
    if (!await requireAdminOrCoach(existing.rows[0].team_id, req.dbUser.id, res)) return;
    const { rows } = await pool.query(
      `UPDATE plays SET name = COALESCE($1, name), type = COALESCE($2, type), season = COALESCE($3, season), notes = COALESCE($4, notes)
       WHERE id = $5 RETURNING *`,
      [name, type, season, notes, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/plays/:id
router.delete('/:id', requireAuth, checkTeamRestricted, async (req, res, next) => {
  try {
    const existing = await pool.query(`SELECT * FROM plays WHERE id = $1`, [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ error: 'Play not found' });
    if (!await requireAdminOrCoach(existing.rows[0].team_id, req.dbUser.id, res)) return;
    await pool.query(`DELETE FROM plays WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// POST /api/plays/copy — copy plays from one season to another
router.post('/copy', requireAuth, async (req, res, next) => {
  const { team_id, from_season, to_season } = req.body;
  if (!team_id || !from_season || !to_season) {
    return res.status(400).json({ error: 'team_id, from_season and to_season required' });
  }
  try {
    if (!await requireAdminOrCoach(team_id, req.dbUser.id, res)) return;
    const { rows } = await pool.query(
      `INSERT INTO plays (team_id, name, type, season, notes)
       SELECT team_id, name, type, $1, notes FROM plays
       WHERE team_id = $2 AND season = $3
       RETURNING *`,
      [to_season, team_id, from_season]
    );
    res.status(201).json(rows);
  } catch (err) { next(err); }
});

module.exports = router;