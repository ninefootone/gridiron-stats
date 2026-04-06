import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getStatInfo, POSITIONS, getPositionsForTeamType } from '../utils/stats';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import styles from './PlayerPage.module.css';
import BottomNav from '../components/shared/BottomNav';
import ConfirmModal, { AlertModal } from '../components/shared/ConfirmModal';

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
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [teamRole, setTeamRole] = useState(null);
  const [team, setTeam] = useState(null);
  const [showAllPositions, setShowAllPositions] = useState(false);
  const isAdmin = teamRole === 'admin';
  const [linkedStats, setLinkedStats] = useState(null);
  const [linkModal, setLinkModal] = useState(false);
  const [linkSearch, setLinkSearch] = useState('');
  const [linkResults, setLinkResults] = useState([]);
  const [linkSaving, setLinkSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/players?team_id=${teamId}`),
      api.get(`/stats?player_id=${playerId}`),
      api.get(`/teams/${teamId}`),
      api.get(`/players/${playerId}/linked-stats`),
    ]).then(([players, s, t, linked]) => {
      setTeamRole(t.my_role);
      setTeam(t);
      const p = players.find(p => String(p.id) === String(playerId));
      setPlayer(p);
      if (p) setEditForm({ name: p.name, number: p.number || '', positions: p.positions || [] });
      setStats(s);
      setLinkedStats(linked);
    }).catch(console.error).finally(() => setLoading(false));
  }, [playerId, teamId]);

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.put(`/players/${playerId}`, { ...editForm, number: editForm.number ? Number(editForm.number) : null, positions: editForm.positions });
      setPlayer(updated);
      setEditModal(false);
    } catch (err) { setAlertModal(err.message); }
    finally { setSaving(false); }
  }

  async function deletePlayer() {
    const playerStats = await api.get(`/stats?player_id=${playerId}`);
    const hasStats = playerStats.length > 0;
    setConfirmModal({
      message: hasStats
        ? `${player.name} has ${playerStats.length} stat${playerStats.length === 1 ? '' : 's'} recorded. Deleting them will permanently remove all their stats. Consider marking them as inactive instead.`
        : `Delete ${player.name}? This cannot be undone.`,
      confirmLabel: hasStats ? 'Delete anyway' : 'Delete',
      onConfirm: async () => {
        await api.del(`/players/${playerId}`);
        navigate(`/teams/${teamId}`);
      },
    });
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ margin: 0 }}>Positions</label>
                  {team?.team_type === 'flag' && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }} onClick={() => setShowAllPositions(p => !p)}>
                      {showAllPositions ? 'Show fewer' : 'Show all positions'}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[
                      ...getPositionsForTeamType(team?.team_type, showAllPositions),
                      ...((editForm.positions || []).filter(p => !getPositionsForTeamType(team?.team_type, true).includes(p)))
                    ].map(pos => (
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

      {/* Cross-team stats */}
      {linkedStats?.linked && linkedStats.players.length > 1 && (
        <div style={{ margin: '20px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 18px' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Club Stats — All Teams</div>
          {linkedStats.players.map(lp => (
            <div key={lp.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 700, marginBottom: 6 }}>
                {lp.team_name} {lp.id === Number(playerId) ? '(this team)' : ''}
              </div>
              {lp.stats.length === 0 ? (
                <div style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>No stats recorded</div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {lp.stats.map(s => {
                    const info = getStatInfo(s.stat_type);
                    return <span key={s.stat_type} className="stat-badge">{info.icon} {info.label}: {s.total}{info.unit ? ` ${info.unit}` : ''}</span>;
                  })}
                </div>
              )}
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12, marginTop: 4 }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--gray-300)', fontWeight: 700, marginBottom: 6 }}>Combined Totals</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(
                linkedStats.players.flatMap(lp => lp.stats).reduce((acc, s) => {
                  acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.total);
                  return acc;
                }, {})
              ).map(([type, total]) => {
                const info = getStatInfo(type);
                return <span key={type} className="stat-badge" style={{ background: 'rgba(245,166,35,0.15)', borderColor: 'rgba(245,166,35,0.3)' }}>{info.icon} {info.label}: {total}{info.unit ? ` ${info.unit}` : ''}</span>;
              })}
            </div>
          </div>
        </div>
      )}

      {/* Link to another player */}
      {teamRole !== 'viewer' && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}
            onClick={() => { setLinkModal(true); setLinkSearch(''); setLinkResults([]); }}>
            🔗 {linkedStats?.linked ? 'Manage club links' : 'Link to player on another team'}
          </button>
        </div>
      )}


      {teamRole !== 'viewer' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', padding: '14px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}>
          <div style={{ flex: 1, fontSize: '0.9rem', color: 'var(--gray-300)' }}>
            {player.name} is currently <span style={{ color: player.active ? 'var(--green, #4ade80)' : 'var(--gray-300)', fontWeight: 700 }}>{player.active ? 'active' : 'inactive'}</span>
          </div>
          <button
            className={`btn btn-sm ${player.active ? 'btn-success' : 'btn-secondary'}`}
            onClick={() => {
              if (player.active) {
                setConfirmModal({
                  message: `Mark ${player.name} as inactive?`,
                  onConfirm: async () => {
                    const updated = await api.patch(`/players/${playerId}/active`, { active: false });
                    setPlayer(updated);
                  },
                });
              } else {
                api.patch(`/players/${playerId}/active`, { active: true })
                  .then(updated => setPlayer(updated));
              }
            }}
          >
            {player.active ? 'Active' : 'Restore'}
          </button>
        </div>
      )}

      {/* Season totals */}
      <div className={styles.section}>
        <div className="section-label">Season Totals</div>
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
            doc.text('Generated by Gridiron Stats · gridiron-stats.co', 14, doc.internal.pageSize.getHeight() - 10);

            doc.save(`${player.name} — Player Report.pdf`);
          }}>
            ⬇ Export Player PDF
          </button>
        </div>
      )}

      {/* By game */}
      {Object.keys(byGame).length > 0 && (
        <div className={styles.section}>
          <div className="section-label">Game Log</div>
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

      {linkModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setLinkModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">Link to Another Player</div>
              <button className="modal-close btn" onClick={() => setLinkModal(false)}>✕</button>
            </div>
            <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 16 }}>
              Search for a player on another team to link their stats together.
            </p>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Search by name</label>
              <input
                className="form-control"
                value={linkSearch}
                onChange={async e => {
                  setLinkSearch(e.target.value);
                  if (e.target.value.trim().length >= 2) {
                    const results = await api.get(`/players/search?name=${encodeURIComponent(e.target.value.trim())}&team_id=${teamId}`);
                    setLinkResults(results.filter(r => r.id !== Number(playerId)));
                  } else {
                    setLinkResults([]);
                  }
                }}
                placeholder="Type player name..."
              />
            </div>
            {linkResults.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {linkResults.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{r.name} {r.number ? `#${r.number}` : ''}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--gray-300)' }}>{r.team_name}</div>
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={linkSaving}
                      onClick={async () => {
                        setLinkSaving(true);
                        try {
                          await api.post(`/players/${playerId}/link`, { link_to_player_id: r.id });
                          const linked = await api.get(`/players/${playerId}/linked-stats`);
                          setLinkedStats(linked);
                          setLinkModal(false);
                        } catch (err) { setAlertModal(err.message); }
                        finally { setLinkSaving(false); }
                      }}
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            )}
            {linkSearch.length >= 2 && linkResults.length === 0 && (
              <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>No matching players found on other teams.</p>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setLinkModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}


      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title || 'Are you sure?'}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel || 'Confirm'}
          confirmClass={confirmModal.confirmClass || 'btn-danger'}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
      {alertModal && (
        <AlertModal
          message={alertModal}
          onClose={() => setAlertModal(null)}
        />
      )}
      <BottomNav
        activeKey=""
        items={[
          { key: 'players', label: 'Players', onClick: () => navigate(`/teams/${teamId}?tab=players`), icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
          { key: 'games', label: 'Games', onClick: () => navigate(`/teams/${teamId}?tab=games`), icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
          ...(isAdmin ? [{ key: 'plays', label: 'Plays', onClick: () => navigate(`/teams/${teamId}?tab=plays`), icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></> }] : []),
          { key: 'leaderboard', label: 'Leaders', onClick: () => navigate(`/teams/${teamId}?tab=leaderboard`), icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
          ...(isAdmin ? [{ key: 'members', label: 'Members', onClick: () => navigate(`/teams/${teamId}?tab=members`), icon: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></> }] : []),
        ]}
      />
      <div className="bottom-nav-padding" />
    </div>
  );
}
