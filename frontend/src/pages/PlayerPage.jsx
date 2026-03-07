import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getStatInfo } from '../utils/stats';
import { format } from 'date-fns';
import styles from './PlayerPage.module.css';

export default function PlayerPage() {
  const { teamId, playerId } = useParams();
  const navigate = useNavigate();
  const api = useApi();

  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/players?team_id=${teamId}`),
      api.get(`/stats?player_id=${playerId}`),
    ]).then(([players, s]) => {
      setPlayer(players.find(p => String(p.id) === String(playerId)));
      setStats(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [playerId, teamId]);

  if (loading) return <div className="spinner" />;
  if (!player) return <div>Player not found</div>;

  // Season totals
  const totals = stats.reduce((acc, s) => {
    acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value);
    return acc;
  }, {});

  // Group by game
  const byGame = {};
  stats.forEach(s => {
    const key = s.game_id;
    if (!byGame[key]) byGame[key] = { opponent_name: s.opponent_name, game_date: s.game_date, stats: [] };
    byGame[key].stats.push(s);
  });

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(`/teams/${teamId}`)}>← Back to Team</button>

      <div className={styles.header}>
        <div className={styles.jersey}>#{player.number ?? '—'}</div>
        <div>
          <div className="page-title">{player.name}</div>
          {player.position && <span className="tag tag-green" style={{ fontSize: '1rem', padding: '4px 14px' }}>{player.position}</span>}
        </div>
      </div>

      {/* Season totals */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Season Totals</div>
        {Object.keys(totals).length === 0 ? (
          <p style={{ color: 'var(--gray-500)' }}>No stats recorded yet.</p>
        ) : (
          <div className={styles.totalsGrid}>
            {Object.entries(totals).map(([type, total]) => {
              const info = getStatInfo(type);
              return (
                <div key={type} className={styles.totalCard}>
                  <div className={styles.totalIcon}>{info.icon}</div>
                  <div className={styles.totalValue}>{total}{info.unit ? ` ${info.unit}` : ''}</div>
                  <div className={styles.totalLabel}>{info.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* By game */}
      {Object.keys(byGame).length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Game Log</div>
          {Object.values(byGame).sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).map(({ opponent_name, game_date, stats: gs }) => (
            <div key={opponent_name + game_date} className={styles.gameLogCard}>
              <div className={styles.gameLogHeader}>
                <div className={styles.gameLogTitle}>vs {opponent_name}</div>
                <div className={styles.gameLogDate}>{format(new Date(game_date), 'd MMM yyyy')}</div>
              </div>
              <div className={styles.gameLogStats}>
                {Object.entries(
                  gs.reduce((acc, s) => { acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value); return acc; }, {})
                ).map(([type, total]) => {
                  const info = getStatInfo(type);
                  return (
                    <span key={type} className="stat-badge">{info.icon} {info.label}: {total}{info.unit ? ` ${info.unit}` : ''}</span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
