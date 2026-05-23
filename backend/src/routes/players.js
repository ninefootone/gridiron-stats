const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { pool } = require('../db/init');
const router = express.Router();
const { checkTeamRestricted } = require('../middleware/checkRestricted');

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
router.post('/', requireAuth, checkTeamRestricted, async (req, res, next) => {
  const { team_id, name, number, positions } = req.body;
  if (!team_id || !name) return res.status(400).json({ error: 'team_id and name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO players (team_id, name, number, positions) VALUES ($1, $2, $3, $4) RETURNING *`,
      [team_id, name, number || null, positions || []]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/players/:id
router.put('/:id', requireAuth, checkTeamRestricted, async (req, res, next) => {
  const { name, number, positions } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE players SET
        name = COALESCE($1, name),
        number = $2,
        positions = COALESCE($3, positions)
       WHERE id = $4
       AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $5 AND role IN ('admin','member'))
       RETURNING *`,
      [name, number ?? null, positions || null, req.params.id, req.dbUser.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Player not found or not authorised' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/players/:id/active
router.patch('/:id/active', requireAuth, async (req, res, next) => {
  const { active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE players SET active = $1
       WHERE id = $2
       AND team_id IN (SELECT team_id FROM team_members WHERE user_id = $3 AND role IN ('admin','member'))
       RETURNING *`,
      [active, req.params.id, req.dbUser.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Player not found or not authorised' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/players/import
router.post('/import', requireAuth, checkTeamRestricted, async (req, res, next) => {
  const { team_id, players } = req.body;
  if (!team_id || !Array.isArray(players)) return res.status(400).json({ error: 'team_id and players array required' });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const p of players) {
        if (!p.name?.trim()) continue;
        const positions = Array.isArray(p.positions) ? p.positions : (p.position ? [p.position] : []);
        const { rows } = await client.query(
          `INSERT INTO players (team_id, name, number, positions)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [team_id, p.name.trim(), p.number ? Number(p.number) : null, positions]
        );
        if (rows.length) inserted.push(rows[0]);
      }
      await client.query('COMMIT');
      res.json({ inserted: inserted.length, players: inserted });
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

// DELETE /api/players/:id
router.delete('/:id', requireAuth, checkTeamRestricted, async (req, res, next) => {
  try {
    await pool.query(`DELETE FROM players WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/players/search — find players with same name across same-admin teams
router.get('/search', requireAuth, async (req, res, next) => {
  const { name, team_id } = req.query;
  if (!name || !team_id) return res.json([]);
  try {
    // Find the admin who created the target team
    const { rows: teamRows } = await pool.query(
      `SELECT created_by FROM teams WHERE id = $1`,
      [team_id]
    );
    if (!teamRows.length) return res.json([]);
    const adminId = teamRows[0].created_by;

    // Find players with matching name on other teams created by same admin
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.number, p.positions, p.club_player_id,
              t.name as team_name, t.id as team_id
       FROM players p
       JOIN teams t ON t.id = p.team_id
       WHERE LOWER(p.name) LIKE LOWER($1)
       AND p.team_id != $2
       AND t.created_by = $3
       AND p.active = true`,
      [name.trim() + '%', team_id, adminId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/players/:id/link — link two players via club_player_id
router.post('/:id/link', requireAuth, async (req, res, next) => {
  const { link_to_player_id } = req.body;
  if (!link_to_player_id) return res.status(400).json({ error: 'link_to_player_id required' });
  try {
    // Get the target player's club_player_id
    const { rows: targetRows } = await pool.query(
      `SELECT id, club_player_id FROM players WHERE id = $1`,
      [link_to_player_id]
    );
    if (!targetRows.length) return res.status(404).json({ error: 'Player not found' });

    let clubPlayerId = targetRows[0].club_player_id;

    // If no existing club_player record, create one
    if (!clubPlayerId) {
      const { rows: clubRows } = await pool.query(
        `INSERT INTO club_players DEFAULT VALUES RETURNING id`
      );
      clubPlayerId = clubRows[0].id;
    }

    // Update both players to share the same club_player_id
    await pool.query(
      `UPDATE players SET club_player_id = $1 WHERE id = $2`,
      [clubPlayerId, link_to_player_id]
    );
    await pool.query(
      `UPDATE players SET club_player_id = $1 WHERE id = $2`,
      [clubPlayerId, req.params.id]
    );

    const { rows } = await pool.query(
      `SELECT * FROM players WHERE id = $1`,
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/players/:id/linked-stats — get stats across all linked players
router.get('/:id/linked-stats', requireAuth, async (req, res, next) => {
  try {
    // Get this player's club_player_id
    const { rows: playerRows } = await pool.query(
      `SELECT id, name, club_player_id FROM players WHERE id = $1`,
      [req.params.id]
    );
    if (!playerRows.length) return res.status(404).json({ error: 'Player not found' });
    const { club_player_id } = playerRows[0];
    if (!club_player_id) return res.json({ linked: false, players: [] });

    // Get all players sharing this club_player_id
    const { rows: linkedPlayers } = await pool.query(
      `SELECT p.id, p.name, p.number, p.team_id, t.name as team_name
       FROM players p
       JOIN teams t ON t.id = p.team_id
       WHERE p.club_player_id = $1`,
      [club_player_id]
    );

    // Get stats for each linked player
    const playersWithStats = await Promise.all(linkedPlayers.map(async lp => {
      const { rows: stats } = await pool.query(
        `SELECT stat_type, SUM(value) as total
         FROM player_stats
         WHERE player_id = $1
         GROUP BY stat_type`,
        [lp.id]
      );
      return { ...lp, stats };
    }));

    res.json({ linked: true, players: playersWithStats });
  } catch (err) { next(err); }
});

// POST /api/players/:id/share-token — generate (or return existing) share token
router.post('/:id/share-token', requireAuth, async (req, res, next) => {
  try {
    // Verify this player belongs to a team the user has access to
    const { rows: check } = await pool.query(
      `SELECT p.id, p.share_token FROM players p
       JOIN team_members tm ON tm.team_id = p.team_id
       WHERE p.id = $1 AND tm.user_id = $2`,
      [req.params.id, req.dbUser.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Player not found or not authorised' });

    // Return existing token or generate a new one
    if (check[0].share_token) return res.json({ token: check[0].share_token });

    const token = require('crypto').randomBytes(16).toString('hex');
    await pool.query(`UPDATE players SET share_token = $1 WHERE id = $2`, [token, req.params.id]);
    res.json({ token });
  } catch (err) { next(err); }
});

// DELETE /api/players/:id/share-token — revoke share token
router.delete('/:id/share-token', requireAuth, async (req, res, next) => {
  try {
    const { rows: check } = await pool.query(
      `SELECT p.id FROM players p
       JOIN team_members tm ON tm.team_id = p.team_id
       WHERE p.id = $1 AND tm.user_id = $2`,
      [req.params.id, req.dbUser.id]
    );
    if (!check.length) return res.status(404).json({ error: 'Player not found or not authorised' });
    await pool.query(`UPDATE players SET share_token = NULL WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/players/:id/awards
router.get('/:id/awards', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ga.id, ga.award_type, ga.notes, ga.logged_at,
              g.id AS game_id, g.opponent_name, g.game_date
       FROM game_awards ga
       JOIN games g ON g.id = ga.game_id
       JOIN players p ON p.id = ga.player_id
       JOIN team_members tm ON tm.team_id = p.team_id
       WHERE ga.player_id = $1 AND tm.user_id = $2
       ORDER BY g.game_date DESC`,
      [req.params.id, req.dbUser.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;