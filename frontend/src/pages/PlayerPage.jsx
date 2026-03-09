import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getStatInfo, POSITIONS } from '../utils/stats';
import { format } from 'date-fns';
import styles from './PlayerPage.module.css';

export default function PlayerPage() {
  const { teamId, playerId } = useParams();
  const navigate = useNavigate();
  const api = useApi();

  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', number: '', position: '' });
  const [saving, setSaving] = useState(false);
  const [teamRole, setTeamRole] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get(`/players?team_id=${teamId}`),
      api.get(`/stats?player_id=${playerId}`),
      api.get(`/teams/${teamId}`),
    ]).then(([players, s, t]) => {
      setTeamRole(t.my_role);
      const p = players.find(p => String(p.id) === String(playerId));
      setPlayer(p);
      if (p) setEditForm({ name: p.name, number: p.number || '', position: p.position || '' });
      setStats(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [playerId, teamId]);

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put(`/players/${playerId}`, { ...editForm, number: editForm.number ? Number(editForm.number) : null });
      setPlayer(updated);
      setEditModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function deletePlayer() {
    if (!confirm(`Delete ${player.name}? This cannot be undone.`)) return;
    await api.del(`/players/${playerId}`);
    navigate(`/teams/${teamId}`);
  }

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
        <div style={{ flex: 1 }}>
          <div className="page-title">{player.name}</div>
          {player.position && <span className="tag tag-green" style={{ fontSize: '1rem', padding: '4px 14px' }}>{player.position}</span>}
        </div>
        {teamRole !== 'viewer' && (
          <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditModal(true)}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={deletePlayer}>Delete</button>
          </div>
        )}
      </div>

      {editModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Edit Player</div>
              <button className="modal-close btn" onClick={() => setEditModal(false)}>✕</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Name *</label>
                <input className="form-control" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="grid-2" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label>Jersey #</label>
                  <input className="form-control" type="number" min="0" max="99" value={editForm.number} onChange={e => setEditForm(p => ({ ...p, number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <select className="form-control" value={editForm.position} onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))}>
                    <option value="">Select...</option>
                    {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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
