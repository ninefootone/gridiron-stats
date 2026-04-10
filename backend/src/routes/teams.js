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
const { checkTeamLimit } = require('../middleware/checkPlan');
router.post('/', requireAuth, checkTeamLimit, async (req, res, next) => {
  const { name, season, description, team_type } = req.body;
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
        `INSERT INTO teams (name, season, description, team_type, created_by, join_code, view_code) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, season, description, team_type ?? null, req.dbUser.id, join_code, view_code]
      );
      const team = rows[0];
      await client.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [team.id, req.dbUser.id]
      );
      await client.query('COMMIT');
      res.status(201).json({
        ...team,
        player_count: 0,
        game_count: 0,
        my_role: 'admin',
        team_type: team.team_type || null,
      });
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
    notifyAdminsOfJoin(team.id, req.dbUser.name, req.dbUser.email, 'join').catch(console.error);
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
    notifyAdminsOfJoin(team.id, req.dbUser.name, req.dbUser.email, 'view').catch(console.error);
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
  const { name, season, description, team_type, notify_on_join } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE teams SET
        name = COALESCE($1, name),
        season = COALESCE($2, season),
        description = COALESCE($3, description),
        team_type = $4,
        notify_on_join = COALESCE($7, notify_on_join)
       WHERE id = $5 AND created_by = $6 RETURNING *`,
      [name, season, description, team_type ?? null, req.params.id, req.dbUser.id, notify_on_join ?? null]
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

// GET /api/teams/:id/members
router.get('/:id/members', requireAuth, async (req, res, next) => {
  try {
    const adminCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [req.params.id, req.dbUser.id]
    );
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.email, u.picture, tm.role
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1
       ORDER BY tm.role DESC, u.name ASC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// PUT /api/teams/:id/members/:userId — change role
router.put('/:id/members/:userId', requireAuth, async (req, res, next) => {
  const { role } = req.body;
  if (!['admin', 'member', 'viewer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  try {
    const adminCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [req.params.id, req.dbUser.id]
    );
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { rows } = await pool.query(
      `UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING *`,
      [role, req.params.id, req.params.userId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Member not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teams/:id/members/:userId — remove member
router.delete('/:id/members/:userId', requireAuth, async (req, res, next) => {
  try {
    const adminCheck = await pool.query(
      `SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [req.params.id, req.dbUser.id]
    );
    if (!adminCheck.rows.length || adminCheck.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { rowCount } = await pool.query(
      `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`,
      [req.params.id, req.params.userId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Member not found' });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/teams/:id/set-active — unrestrict chosen team, restrict others
router.post('/:id/set-active', requireAuth, async (req, res, next) => {
  try {
    // Get user's plan
    const { rows: subRows } = await pool.query(
      `SELECT plan FROM subscriptions WHERE user_id = $1`,
      [req.dbUser.id]
    );
    const plan = subRows[0]?.plan || 'free';
    const allowedTeams = plan === 'club' ? Infinity : 1;

    // Get all teams created by this user
    const { rows: teams } = await pool.query(
      `SELECT id FROM teams WHERE created_by = $1 ORDER BY id ASC`,
      [req.dbUser.id]
    );

    // Unrestrict chosen team, restrict others beyond limit
    const chosenId = Number(req.params.id);
    const activeTeams = [chosenId];

    for (const team of teams) {
      if (team.id === chosenId) continue;
      if (activeTeams.length < allowedTeams) {
        activeTeams.push(team.id);
      }
    }

    for (const team of teams) {
      const restricted = !activeTeams.includes(team.id);
      await pool.query(
        `UPDATE teams SET restricted = $1 WHERE id = $2`,
        [restricted, team.id]
      );
    }

    res.json({ success: true });
  } catch (err) { next(err); }
});

async function notifyAdminsOfJoin(teamId, joinerName, joinerEmail, joinType) {
  if (!process.env.BREVO_API_KEY) return;
  try {
    // Check if notifications are enabled for this team
    const { rows: teamRows } = await pool.query(
      `SELECT t.name, t.notify_on_join FROM teams t WHERE t.id = $1`,
      [teamId]
    );
    if (!teamRows.length || !teamRows[0].notify_on_join) return;
    const teamName = teamRows[0].name;

    // Get all admins for this team
    const { rows: admins } = await pool.query(
      `SELECT u.email, u.name FROM users u
       JOIN team_members tm ON tm.user_id = u.id
       WHERE tm.team_id = $1 AND tm.role = 'admin'`,
      [teamId]
    );
    if (!admins.length) return;

    // Send email to each admin
    for (const admin of admins) {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': process.env.BREVO_API_KEY,
        },
        body: JSON.stringify({
          sender: { name: 'Gridiron Stats', email: 'hello@gridiron-stats.app' },
          to: [{ email: admin.email, name: admin.name }],
          subject: `${joinerName} joined ${teamName}`,
          htmlContent: `
            <h2>New team member</h2>
            <p><strong>${joinerName}</strong> (${joinerEmail}) has joined <strong>${teamName}</strong> as a ${joinType === 'view' ? 'viewer' : 'coach'}.</p>
            <p>You can manage your team members at <a href="https://app.gridiron-stats.co">app.gridiron-stats.co</a>.</p>
            <hr>
            <p style="font-size:12px;color:#999;">You're receiving this because you're an admin of ${teamName}. You can turn off these notifications in your team settings.</p>
          `,
        }),
      });
    }
  } catch (err) {
    console.error('Join notification error:', err);
  }
}

module.exports = router;