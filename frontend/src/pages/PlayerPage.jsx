import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getStatInfo, POSITIONS } from '../utils/stats';
import { jsPDF } from 'jspdf';
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
  const [editForm, setEditForm] = useState({ name: '', number: '', positions: [] });
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
      if (p) setEditForm({ name: p.name, number: p.number || '', positions: p.positions || [] });
      setStats(s);
    }).catch(console.error).finally(() => setLoading(false));
  }, [playerId, teamId]);

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put(`/players/${playerId}`, { ...editForm, number: editForm.number ? Number(editForm.number) : null, positions: editForm.positions });
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
          <div className="page-title" style={{ marginBottom: 8 }}>{player.name}</div>
          {player.positions?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {player.positions.map(pos => POSITIONS.includes(pos)
                ? <span key={pos} className="tag tag-green" style={{ fontSize: '1rem', padding: '4px 14px' }}>{pos}</span>
                : <span key={pos} className="tag tag-gold" style={{ fontSize: '1rem', padding: '4px 14px', cursor: 'pointer' }} title="Unrecognised position — click Edit to remove" onClick={() => setEditModal(true)}>⚠️ {pos}</span>
              )}
            </div>
          )}
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
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Jersey #</label>
                <input className="form-control" type="number" min="0" max="99" value={editForm.number} onChange={e => setEditForm(p => ({ ...p, number: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Positions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {POSITIONS.map(pos => (
                      <button
                        key={pos}
                        type="button"
                        className={`btn btn-sm ${editForm.positions?.includes(pos) ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setEditForm(p => ({
                          ...p,
                          positions: p.positions?.includes(pos)
                            ? p.positions.filter(x => x !== pos)
                            : [...(p.positions || []), pos]
                        }))}
                      >
                        {pos}
                      </button>
                    ))}
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

      {teamRole !== 'viewer' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', padding: '14px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--gray-300)' }}>
            {player.name} is currently <span style={{ color: player.active ? 'var(--green, #4ade80)' : 'var(--gray-300)', fontWeight: 700 }}>{player.active ? 'active' : 'inactive'}</span>
          </div>
          <button
            className={`btn btn-sm ${player.active ? 'btn-success' : 'btn-secondary'}`}
            onClick={async () => {
              if (player.active && !confirm(`Mark ${player.name} as inactive?`)) return;
              const updated = await api.patch(`/players/${playerId}/active`, { active: !player.active });
              setPlayer(updated);
            }}
          >
            {player.active ? 'Active' : 'Restore'}
          </button>
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

      {teamRole === 'admin' && (
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 20;

            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(`#${player.number ?? '—'} ${player.name}`, 14, y);
            y += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            if (player.positions?.length > 0) {
              doc.text(`Position${player.positions.length > 1 ? 's' : ''}: ${player.positions.join(', ')}`, 14, y);
              y += 6;
            }
            doc.text(`Status: ${player.active ? 'Active' : 'Inactive'}`, 14, y);
            y += 10;

            // Divider
            doc.setDrawColor(200);
            doc.line(14, y, pageWidth - 14, y);
            y += 8;

            // Season totals
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('Season Totals', 14, y);
            y += 8;

            if (Object.keys(totals).length === 0) {
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(100);
              doc.text('No stats recorded yet.', 14, y);
              y += 8;
            } else {
              const totalLine = Object.entries(totals).map(([type, total]) => {
                const info = getStatInfo(type);
                return `${info.label}: ${total}${info.unit ? ' ' + info.unit : ''}`;
              }).join('  ·  ');
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(60);
              const lines = doc.splitTextToSize(totalLine, pageWidth - 28);
              doc.text(lines, 14, y);
              y += lines.length * 5 + 8;
            }

            // Divider
            doc.setDrawColor(200);
            doc.line(14, y, pageWidth - 14, y);
            y += 8;

            // Game log
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('Game Log', 14, y);
            y += 8;

            Object.values(byGame).sort((a, b) => new Date(b.game_date) - new Date(a.game_date)).forEach(({ opponent_name, game_date, stats: gs }) => {
              if (y > 265) { doc.addPage(); y = 20; }

              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0);
              doc.text(`vs ${opponent_name}`, 14, y);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(120);
              doc.text(format(new Date(game_date), 'd MMM yyyy'), pageWidth - 14, y, { align: 'right' });
              y += 6;

              const gameTotals = gs.reduce((acc, s) => {
                acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value);
                return acc;
              }, {});

              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(60);
              const statLine = Object.entries(gameTotals).map(([type, total]) => {
                const info = getStatInfo(type);
                return `${info.label}: ${total}${info.unit ? ' ' + info.unit : ''}`;
              }).join('  ·  ');
              const lines = doc.splitTextToSize(statLine, pageWidth - 28);
              doc.text(lines, 20, y);
              y += lines.length * 5 + 6;
            });

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Generated by Gridiron Stats · gridiron-stats.co.uk', 14, doc.internal.pageSize.getHeight() - 10);

            doc.save(`${player.name} — Player Report.pdf`);
          }}>
            ⬇ Export Player PDF
          </button>
        </div>
      )}

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
