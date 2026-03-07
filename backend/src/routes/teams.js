const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

// GET /api/teams — list teams the current user belongs to
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name as creator_name,
              (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.active = true) AS player_count,
              (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id) AS game_count
       FROM teams t
       LEFT JOIN users u ON u.id = t.created_by
       WHERE t.created_by = $1
          OR t.id IN (SELECT team_id FROM team_members WHERE user_id = $1)
       ORDER BY t.created_at DESC`,
      [req.dbUser.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/teams — create a team
router.post('/', requireAuth, async (req, res, next) => {
  const { name, season, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO teams (name, season, description, created_by) VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, season, description, req.dbUser.id]
      );
      const team = rows[0];
      // Creator also gets a team_member record with admin role
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [team.id, req.dbUser.id]
      );
      await client.query('COMMIT');
      res.status(201).json(team);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name as creator_name FROM teams t LEFT JOIN users u ON u.id = t.created_by WHERE t.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Team not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/teams/:id
router.put('/:id', requireAuth, async (req, res, next) => {
  const { name, season, description } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE teams SET name = COALESCE($1, name), season = COALESCE($2, season), description = COALESCE($3, description)
       WHERE id = $4 AND created_by = $5 RETURNING *`,
      [name, season, description, req.params.id, req.dbUser.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Team not found or not authorised' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teams/:id
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM teams WHERE id = $1 AND created_by = $2`,
      [req.params.id, req.dbUser.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Team not found or not authorised' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
