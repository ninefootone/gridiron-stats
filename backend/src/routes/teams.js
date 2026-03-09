const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

function generateCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/teams
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name as creator_name,
              (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.active = true) AS player_count,
              (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id) AS game_count,
              tm.role as my_role
       FROM teams t
       LEFT JOIN users u ON u.id = t.created_by
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $1
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

// POST /api/teams
router.post('/', requireAuth, async (req, res, next) => {
  const { name, season, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required' });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let join_code, view_code, attempts = 0;
      while ((!join_code || !view_code) && attempts < 10) {
        const jc = generateCode(6);
        const vc = generateCode(6);
        const ej = await client.query('SELECT id FROM teams WHERE join_code = $1', [jc]);
        const ev = await client.query('SELECT id FROM teams WHERE view_code = $1', [vc]);
        if (!ej.rows.length) join_code = jc;
        if (!ev.rows.length) view_code = vc;
        attempts++;
      }
      const { rows } = await client.query(
        `INSERT INTO teams (name, season, description, created_by, join_code, view_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, season, description, req.dbUser.id, join_code, view_code]
      );
      const team = rows[0];
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

// POST /api/teams/join — join as member
router.post('/join', requireAuth, async (req, res, next) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Join code required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM teams WHERE UPPER(join_code) = UPPER($1)`,
      [code.trim()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid join code — double check and try again' });
    const team = rows[0];
    const existing = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [team.id, req.dbUser.id]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: 'You are already a member of this team' });
    }
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'member')`,
      [team.id, req.dbUser.id]
    );
    res.json({ success: true, team });
  } catch (err) {
    next(err);
  }
});

// POST /api/teams/view — join as viewer
router.post('/view', requireAuth, async (req, res, next) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'View code required' });
  try {
    const { rows } = await pool.query(
      `SELECT * FROM teams WHERE UPPER(view_code) = UPPER($1)`,
      [code.trim()]
    );
    if (!rows.length) return res.status(404).json({ error: 'Invalid view code — double check and try again' });
    const team = rows[0];
    const existing = await pool.query(
      `SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [team.id, req.dbUser.id]
    );
    if (existing.rows.length) {
      return res.status(400).json({ error: 'You already have access to this team' });
    }
    await pool.query(
      `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'viewer')`,
      [team.id, req.dbUser.id]
    );
    res.json({ success: true, team });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teams/:id/leave
router.delete('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2 AND role != 'admin'`,
      [req.params.id, req.dbUser.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not a member of this team or not authorised' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/teams/:id
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name as creator_name,
              tm.role as my_role
       FROM teams t
       LEFT JOIN users u ON u.id = t.created_by
       LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = $2
       WHERE t.id = $1`,
      [req.params.id, req.dbUser.id]
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