const SCORING_STATS = {
  td_receiving: 6,
  td_rushing: 6,
  td_return: 6,
  one_pt_rec: 1,
  one_pt_carry: 1,
  two_pt_rec: 2,
  two_pt_carry: 2,
  safety: 2,
};

async function recalculateOurScore(pool, game_id) {
  // Sum scoring stats
  const { rows: statRows } = await pool.query(
    `SELECT ps.stat_type, SUM(ps.value) AS total
     FROM player_stats ps
     WHERE ps.game_id = $1
     GROUP BY ps.stat_type`,
    [game_id]
  );

  let score = 0;
  statRows.forEach(row => {
    const pts = SCORING_STATS[row.stat_type];
    if (pts) score += pts * Number(row.total);
  });

  // Add any adjustments for our team
  const { rows: adjRows } = await pool.query(
    `SELECT COALESCE(SUM(adjustment), 0) AS total
     FROM score_adjustments
     WHERE game_id = $1 AND team = 'ours'`,
    [game_id]
  );
  score += Number(adjRows[0].total);

  // Update game
  await pool.query(
    `UPDATE games SET our_score = $1 WHERE id = $2 AND score_locked = false`,
    [Math.max(0, score), game_id]
  );

  return Math.max(0, score);
}

module.exports = { recalculateOurScore, SCORING_STATS };