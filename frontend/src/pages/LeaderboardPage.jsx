import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getStatInfo, STAT_CATEGORIES, ALL_STATS } from '../utils/stats';
import styles from './LeaderboardPage.module.css';
import { getStatIcon } from '../utils/icons';

export default function LeaderboardPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const api = useApi();

  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState('td_passing');

  useEffect(() => {
    api.get(`/stats/summary?team_id=${teamId}`)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  // Build leaderboard for selected stat
  const leaderboard = summary
    .filter(r => r.stat_type === selectedStat)
    .sort((a, b) => b.total - a.total);

  const availableStats = [...new Set(summary.map(r => r.stat_type))];
  const statInfo = getStatInfo(selectedStat);

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(`/teams/${teamId}`)}>← Back to Team</button>

      <div className="page-header">
        <div>
          <div className="page-title">Leaderboard</div>
          <div className="page-subtitle">Season leaders across all stats</div>
        </div>
      </div>

      {summary.length === 0 ? (
        <div className="empty-state"><div className="icon">📊</div><p>No stats recorded yet this season.</p></div>
      ) : (
        <div className={styles.layout}>
          {/* Stat selector */}
          <div className={styles.statSelector}>
            {Object.entries(STAT_CATEGORIES).map(([catKey, cat]) => (
              <div key={catKey}>
                <div className={styles.catLabel} style={{ color: cat.color }}>{cat.label}</div>
                {cat.stats.filter(s => availableStats.includes(s.key)).map(s => (
                  <button
                    key={s.key}
                    className={`${styles.statPill} ${selectedStat === s.key ? styles.activeStatPill : ''}`}
                    onClick={() => setSelectedStat(s.key)}
                  >
                    {getStatIcon(s.icon)} {s.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Leaderboard */}
          <div className={styles.board}>
            <div className={styles.boardTitle}>{statInfo.icon} {statInfo.label} Leaders</div>
            {leaderboard.length === 0 ? (
              <p style={{ color: 'var(--gray-500)' }}>No data for this stat yet.</p>
            ) : (
              leaderboard.map((row, i) => (
                <div
                  key={row.id}
                  className={`${styles.leaderRow} ${i === 0 ? styles.first : ''}`}
                  onClick={() => navigate(`/teams/${teamId}/players/${row.id}`)}
                >
                  <div className={styles.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                  <div className={styles.playerNum}>#{row.number}</div>
                  <div className={styles.leaderInfo}>
                    <div className={styles.leaderName}>{row.name}</div>
                    {row.position && <span className="tag tag-gray" style={{ fontSize: '0.72rem' }}>{row.position}</span>}
                  </div>
                  <div className={styles.leaderTotal}>
                    {row.total}{statInfo.unit ? ` ${statInfo.unit}` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
