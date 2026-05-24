const express = require('express');
const { pool } = require('../db/init');
const router = express.Router();

// GET /api/public/games/:viewCode/:id
router.get('/games/:viewCode/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT g.id, g.opponent_name, g.game_date, g.game_time, g.home_away,
              g.our_score, g.opponent_score, g.game_type, g.location, g.game_status, g.whistle_game_id
       FROM games g
       JOIN teams t ON t.id = g.team_id
       WHERE g.id = $1 AND UPPER(t.view_code) = UPPER($2)`,
      [req.params.id, req.params.viewCode]
    );
    if (!rows.length) return res.status(404).json({ error: 'Game not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/public/stats?game_id=X&view_code=Y
router.get('/stats', async (req, res, next) => {
  const { game_id, view_code } = req.query;
  if (!game_id || !view_code) return res.status(400).json({ error: 'game_id and view_code required' });
  try {
    const { rows } = await pool.query(
      `SELECT ps.id, ps.stat_type, ps.value, ps.notes, ps.logged_at, ps.game_id,
              p.name AS player_name, p.number AS player_number
       FROM player_stats ps
       JOIN players p ON p.id = ps.player_id
       JOIN games g ON g.id = ps.game_id
       JOIN teams t ON t.id = g.team_id
       WHERE ps.game_id = $1 AND UPPER(t.view_code) = UPPER($2)
       ORDER BY ps.logged_at DESC`,
      [game_id, view_code]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/opponent-stats?game_id=X&view_code=Y
router.get('/opponent-stats', async (req, res, next) => {
  const { game_id, view_code } = req.query;
  if (!game_id || !view_code) return res.status(400).json({ error: 'game_id and view_code required' });
  try {
    const { rows } = await pool.query(
      `SELECT os.* FROM opponent_stats os
       JOIN games g ON g.id = os.game_id
       JOIN teams t ON t.id = g.team_id
       WHERE os.game_id = $1 AND UPPER(t.view_code) = UPPER($2)
       ORDER BY os.logged_at DESC`,
      [game_id, view_code]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/players/:token — public player profile by share token
router.get('/players/:token', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.number, p.positions, p.active, t.name AS team_name
       FROM players p
       JOIN teams t ON t.id = p.team_id
       WHERE p.share_token = $1`,
      [req.params.token]
    );
    if (!rows.length) return res.status(404).json({ error: 'Player not found' });
    res.json(rows[0]);
  } catch (err) { next(err); }
});

// GET /api/public/players/:token/stats — public player stats by share token
router.get('/players/:token/stats', async (req, res, next) => {
  try {
    const { rows: playerRows } = await pool.query(
      `SELECT p.id FROM players p WHERE p.share_token = $1`,
      [req.params.token]
    );
    if (!playerRows.length) return res.status(404).json({ error: 'Player not found' });
    const playerId = playerRows[0].id;
    const { rows } = await pool.query(
      `SELECT ps.stat_type, ps.value, ps.logged_at, ps.game_id,
              g.opponent_name, g.game_date, g.our_score, g.opponent_score
       FROM player_stats ps
       JOIN games g ON g.id = ps.game_id
       WHERE ps.player_id = $1
       ORDER BY g.game_date DESC, ps.logged_at DESC`,
      [playerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/players/:token/awards — public player awards by share token
router.get('/players/:token/awards', async (req, res, next) => {
  try {
    const { rows: playerRows } = await pool.query(
      `SELECT p.id FROM players p WHERE p.share_token = $1`,
      [req.params.token]
    );
    if (!playerRows.length) return res.status(404).json({ error: 'Player not found' });
    const playerId = playerRows[0].id;
    const { rows } = await pool.query(
      `SELECT ga.id, ga.award_type, ga.notes, ga.logged_at,
              g.id AS game_id, g.opponent_name, g.game_date
       FROM game_awards ga
       JOIN games g ON g.id = ga.game_id
       WHERE ga.player_id = $1
       ORDER BY g.game_date DESC`,
      [playerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/public/stats-summary — public platform stats for marketing site
router.get('/stats-summary', async (req, res, next) => {
  try {
    const [users, teams, players, games, plays] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM teams'),
      pool.query('SELECT COUNT(*) FROM players WHERE active = true'),
      pool.query('SELECT COUNT(*) FROM games'),
      pool.query('SELECT COUNT(*) FROM plays'),
    ]);
    res.json({
      coaches: Number(users.rows[0].count),
      teams: Number(teams.rows[0].count),
      players: Number(players.rows[0].count),
      games: Number(games.rows[0].count),
      plays: Number(plays.rows[0].count),
    });
  } catch (err) { next(err); }
});

module.exports = router;