const express = require('express');
const router = express.Router();
const { pool } = require('../db/init');

// Beta gate middleware
function betaCheck(req, res, next) {
  const betaUsers = (process.env.DRILLS_BETA_USERS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (betaUsers.length === 0) return next(); // no env var = open to all
  if (betaUsers.includes(req.auth?.userId)) return next();
  return res.status(403).json({ error: 'Drills is in beta. Check back soon.' });
}

// ── DRILLS ──────────────────────────────────────────

// GET /drills — list your own + community drills
router.get('/', betaCheck, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, u.name AS creator_name,
        (d.created_by = $1) AS is_owner
       FROM drills d
       JOIN users u ON u.id = d.created_by
       WHERE d.created_by = $1 OR d.visibility = 'community'
       ORDER BY d.created_at DESC`,
      [req.dbUser.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /drills — create a drill
router.post('/', betaCheck, async (req, res, next) => {
  try {
    const { title, description, tags, youtube_url, diagram_data, diagram_image_url, visibility } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO drills (created_by, title, description, tags, youtube_url, diagram_data, diagram_image_url, visibility)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.dbUser.id, title, description || null, tags || [], youtube_url || null, diagram_data || {}, diagram_image_url || null, visibility || 'private']
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// PUT /drills/:id — update a drill (owner only)
router.put('/:id', betaCheck, async (req, res, next) => {
  try {
    const { title, description, tags, youtube_url, diagram_data, diagram_image_url, visibility } = req.body;
    const { rows } = await pool.query(
      `UPDATE drills SET title=$1, description=$2, tags=$3, youtube_url=$4,
       diagram_data=$5, diagram_image_url=$6, visibility=$7, updated_at=NOW()
       WHERE id=$8 AND created_by=$9 RETURNING *`,
      [title, description || null, tags || [], youtube_url || null, diagram_data || {}, diagram_image_url || null, visibility || 'private', req.params.id, req.dbUser.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// DELETE /drills/:id — owner only
router.delete('/:id', betaCheck, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM drills WHERE id=$1 AND created_by=$2`, [req.params.id, req.dbUser.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── SESSIONS ─────────────────────────────────────────

// GET /drills/sessions — list your sessions
router.get('/sessions', betaCheck, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.*, t.name AS team_name,
        (SELECT COUNT(*) FROM session_items si WHERE si.session_id = s.id) AS item_count
       FROM sessions s
       LEFT JOIN teams t ON t.id = s.team_id
       WHERE s.created_by = $1
       ORDER BY s.date DESC NULLS LAST, s.created_at DESC`,
      [req.dbUser.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /drills/sessions/:id — single session with items
router.get('/sessions/:id', betaCheck, async (req, res, next) => {
  try {
    const { rows: [session] } = await pool.query(
      `SELECT s.*, t.name AS team_name FROM sessions s
       LEFT JOIN teams t ON t.id = s.team_id
       WHERE s.id=$1 AND s.created_by=$2`,
      [req.params.id, req.dbUser.id]
    );
    if (!session) return res.status(404).json({ error: 'Not found' });
    const { rows: items } = await pool.query(
      `SELECT si.*, d.title AS drill_title, d.tags AS drill_tags
       FROM session_items si
       LEFT JOIN drills d ON d.id = si.drill_id
       WHERE si.session_id=$1
       ORDER BY si.position ASC`,
      [req.params.id]
    );
    res.json({ ...session, items });
  } catch (err) { next(err); }
});

// POST /drills/sessions — create session with items
router.post('/sessions', betaCheck, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, date, team_id, notes, items } = req.body;
    const { rows: [session] } = await client.query(
      `INSERT INTO sessions (created_by, team_id, title, date, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.dbUser.id, team_id || null, title, date || null, notes || null]
    );
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const { type, drill_id, label, start_time, duration_mins } = items[i];
        await client.query(
          `INSERT INTO session_items (session_id, drill_id, position, type, label, start_time, duration_mins)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [session.id, drill_id || null, i, type || 'element', label || null, start_time || null, duration_mins || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(session);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// PUT /drills/sessions/:id — update session + replace items
router.put('/sessions/:id', betaCheck, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { title, date, team_id, notes, items } = req.body;
    const { rows: [session] } = await client.query(
      `UPDATE sessions SET title=$1, date=$2, team_id=$3, notes=$4, updated_at=NOW()
       WHERE id=$5 AND created_by=$6 RETURNING *`,
      [title, date || null, team_id || null, notes || null, req.params.id, req.dbUser.id]
    );
    if (!session) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }
    await client.query(`DELETE FROM session_items WHERE session_id=$1`, [session.id]);
    if (items?.length) {
      for (let i = 0; i < items.length; i++) {
        const { type, drill_id, label, start_time, duration_mins } = items[i];
        await client.query(
          `INSERT INTO session_items (session_id, drill_id, position, type, label, start_time, duration_mins)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [session.id, drill_id || null, i, type || 'element', label || null, start_time || null, duration_mins || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(session);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
});

// DELETE /drills/sessions/:id
router.delete('/sessions/:id', betaCheck, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM sessions WHERE id=$1 AND created_by=$2`, [req.params.id, req.dbUser.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;