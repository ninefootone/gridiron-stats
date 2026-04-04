const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');

const router = express.Router();

// GET /api/users/me — returns or creates the current user
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    res.json(req.dbUser);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/admin/stats — superadmin only
router.get('/admin/stats', requireAuth, async (req, res, next) => {
  const ADMIN_IDS = ['user_3AiQe1YxmWYTooEO5Ix0HnmJ9Tx', 'user_3AgGD3kALzcbzzPc0PHGo2lwwr8'];
  if (!ADMIN_IDS.includes(req.dbUser.auth0_id)) return res.status(403).json({ error: 'Forbidden' });
  try {
    const [users, teamCount, teams, players, games, plays] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM teams'),
      pool.query(`SELECT t.*, u.name as creator_name,
                  (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count,
                  (SELECT COUNT(*) FROM players p WHERE p.team_id = t.id AND p.active = true) as player_count,
                  (SELECT COUNT(*) FROM games g WHERE g.team_id = t.id) as game_count
                  FROM teams t LEFT JOIN users u ON u.id = t.created_by
                  ORDER BY t.created_at DESC`),
      pool.query('SELECT COUNT(*) FROM players WHERE active = true'),
      pool.query('SELECT COUNT(*) FROM games'),
      pool.query('SELECT COUNT(*) FROM plays'),
    ]);
    res.json({
      stats: {
        users: Number(users.rows[0].count),
        teams: Number(teamCount.rows[0].count),
        players: Number(players.rows[0].count),
        games: Number(games.rows[0].count),
        plays: Number(plays.rows[0].count),
      },
      teams: teams.rows,
    });

  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/me — delete account
router.delete('/me', requireAuth, async (req, res, next) => {
  const { delete_data } = req.body;
  try {
    const userId = req.dbUser.id;
    const authId = req.dbUser.auth0_id;

    // Find teams where user is sole admin
    const { rows: soleAdminTeams } = await pool.query(`
      SELECT t.id, t.name FROM teams t
      WHERE t.created_by = $1
      AND (
        SELECT COUNT(*) FROM team_members tm
        WHERE tm.team_id = t.id AND tm.role = 'admin'
      ) = 1
    `, [userId]);

    if (delete_data) {
      // Delete all teams and their data where user is sole admin
      for (const team of soleAdminTeams) {
        await pool.query(`DELETE FROM player_stats WHERE game_id IN (SELECT id FROM games WHERE team_id = $1)`, [team.id]);
        await pool.query(`DELETE FROM opponent_stats WHERE game_id IN (SELECT id FROM games WHERE team_id = $1)`, [team.id]);
        await pool.query(`DELETE FROM score_adjustments WHERE game_id IN (SELECT id FROM games WHERE team_id = $1)`, [team.id]);
        await pool.query(`DELETE FROM plays WHERE team_id = $1`, [team.id]);
        await pool.query(`DELETE FROM games WHERE team_id = $1`, [team.id]);
        await pool.query(`DELETE FROM players WHERE team_id = $1`, [team.id]);
        await pool.query(`DELETE FROM team_members WHERE team_id = $1`, [team.id]);
        await pool.query(`DELETE FROM teams WHERE id = $1`, [team.id]);
      }
    }

    // Remove from Brevo
    if (process.env.BREVO_API_KEY && req.dbUser.email) {
      try {
        await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(req.dbUser.email)}`, {
          method: 'DELETE',
          headers: { 'api-key': process.env.BREVO_API_KEY },
        });
      } catch (e) {
        console.error('Brevo delete failed:', e);
      }
    }

    // Delete from our database (cascades to team_members, subscriptions)
    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);

    // Delete from Clerk
    const { createClerkClient } = require('@clerk/express');
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await clerk.users.deleteUser(authId);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/sole-admin-teams — check before deletion
router.get('/me/sole-admin-teams', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.id, t.name,
        (SELECT COUNT(*) FROM players WHERE team_id = t.id) as player_count,
        (SELECT COUNT(*) FROM games WHERE team_id = t.id) as game_count
      FROM teams t
      WHERE t.created_by = $1
      AND (
        SELECT COUNT(*) FROM team_members tm
        WHERE tm.team_id = t.id AND tm.role = 'admin'
      ) = 1
    `, [req.dbUser.id]);
    res.json(rows);
  } catch (err) { next(err); }
});

// PATCH /api/users/me/email-opt-out — toggle email opt out
router.patch('/me/email-opt-out', requireAuth, async (req, res, next) => {
  try {
    const { opt_out } = req.body;
    
    await pool.query(
      `UPDATE users SET email_opt_out = $1 WHERE id = $2`,
      [opt_out, req.dbUser.id]
    );

    // Update Brevo
    if (process.env.BREVO_API_KEY && req.dbUser.email) {
      try {
        if (opt_out) {
          // Remove from list
          await fetch(`https://api.brevo.com/v3/contacts/lists/2/contacts/remove`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({ emails: [req.dbUser.email] }),
          });
        } else {
          // Add back to list
          await fetch('https://api.brevo.com/v3/contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'api-key': process.env.BREVO_API_KEY,
            },
            body: JSON.stringify({
              email: req.dbUser.email,
              listIds: [2],
              updateEnabled: true,
            }),
          });
        }
      } catch (e) {
        console.error('Brevo opt-out update failed:', e);
      }
    }

    res.json({ success: true, email_opt_out: opt_out });
  } catch (err) { next(err); }
});

module.exports = router;