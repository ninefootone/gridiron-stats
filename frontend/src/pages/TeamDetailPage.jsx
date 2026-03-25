import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import ConfirmModal, { AlertModal } from '../components/shared/ConfirmModal';
import { format } from 'date-fns';
import styles from './TeamDetailPage.module.css';
import lbStyles from './LeaderboardPage.module.css';
import BottomNav from '../components/shared/BottomNav';
import { getStatInfo, STAT_CATEGORIES, getPositionsForTeamType, normalisePosition } from '../utils/stats';
import UpgradeModal from '../components/shared/UpgradeModal';

function LeaderboardTab({ teamId, onPlayerClick }) {
  const api = useApi();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStat, setSelectedStat] = useState('td_passing');

  useEffect(() => {
    api.get(`/stats/summary?team_id=${teamId}`)
      .then(res => setSummary(res.summary))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  const leaderboard = summary
    .filter(r => r.stat_type === selectedStat)
    .sort((a, b) => b.total - a.total);

  const availableStats = [...new Set(summary.map(r => r.stat_type))];
  const statInfo = getStatInfo(selectedStat);
  const [upgradeModal, setUpgradeModal] = useState(null);

  if (loading) return <div className="spinner" />;

  if (summary.length === 0) return (
    <div className="empty-state"><div className="icon">📊</div><p>No stats recorded yet this season.</p></div>
  );

  return (
    <div className={lbStyles.layout}>
      <div className={lbStyles.statSelector}>
        {Object.entries(STAT_CATEGORIES).map(([catKey, cat]) => (
          <div key={catKey}>
            <div className={lbStyles.catLabel} style={{ color: cat.color }}>{cat.label}</div>
            {cat.stats.filter(s => availableStats.includes(s.key)).map(s => (
              <button
                key={s.key}
                className={`${lbStyles.statPill} ${selectedStat === s.key ? lbStyles.activeStatPill : ''}`}
                onClick={() => setSelectedStat(s.key)}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className={lbStyles.board}>
        <div className={lbStyles.boardTitle}>{statInfo.icon} {statInfo.label} Leaders</div>
        {leaderboard.length === 0 ? (
          <p style={{ color: 'var(--gray-500)' }}>No data for this stat yet.</p>
        ) : (
          leaderboard.map((row, i) => (
            <div
              key={row.id}
              className={`${lbStyles.leaderRow} ${i === 0 ? lbStyles.first : ''}`}
              onClick={() => onPlayerClick(row.id)}
            >
              <div className={lbStyles.rank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
              <div className={lbStyles.playerNum}>#{row.number}</div>
              <div className={lbStyles.leaderInfo}>
                <div className={lbStyles.leaderName}>{row.name}</div>
                {row.position && <span className="tag tag-gray" style={{ fontSize: '0.72rem' }}>{row.position}</span>}
              </div>
              <div className={lbStyles.leaderTotal}>
                {row.total}{statInfo.unit ? ` ${statInfo.unit}` : ''}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [team, setTeam] = useState(null);
  const isViewer = team?.my_role === 'viewer';
  const isAdmin = team?.my_role === 'admin';
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'players');
  const [playerSort, setPlayerSort] = useState('number');
  const [importing, setImporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importError, setImportError] = useState('');
  const [addPlayerMenuModal, setAddPlayerMenuModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modals
  const [playerModal, setPlayerModal] = useState(false);
  const [gameModal, setGameModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [showCompletedGames, setShowCompletedGames] = useState(false);
  const [playerForm, setPlayerForm] = useState({ name: '', number: '', positions: [] });
  const [showAllPositions, setShowAllPositions] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [gameForm, setGameForm] = useState({ opponent_name: '', location: '', game_date: '', game_time: '', home_away: 'home', notes: '', game_type: 'regular' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [plays, setPlays] = useState([]);
  const [playsLoading, setPlaysLoading] = useState(false);
  const [playModal, setPlayModal] = useState(false);
  const [editingPlay, setEditingPlay] = useState(null);
  const [playForm, setPlayForm] = useState({ name: '', type: 'offense', season: '', notes: '' });
  const [copyPlaysModal, setCopyPlaysModal] = useState(false);
  const [copyFromSeason, setCopyFromSeason] = useState('');
  const [copyToSeason, setCopyToSeason] = useState('');
  const [editTeamModal, setEditTeamModal] = useState(false);
  const [editTeamForm, setEditTeamForm] = useState({ name: '', season: '', description: '', team_type: null });

  useEffect(() => {
    Promise.all([
      api.get(`/teams/${teamId}`),
      api.get(`/players?team_id=${teamId}`),
      api.get(`/games?team_id=${teamId}`),
    ]).then(([t, p, g]) => { setTeam(t); setPlayers(p); setGames(g); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [teamId]);

  async function addPlayer(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editingPlayer) {
        const p = await api.put(`/players/${editingPlayer.id}`, { ...playerForm, number: playerForm.number ? Number(playerForm.number) : null, positions: playerForm.positions });
        setPlayers(prev => prev.map(pl => pl.id === p.id ? p : pl));
      } else {
        const p = await api.post('/players', { team_id: Number(teamId), ...playerForm, number: playerForm.number ? Number(playerForm.number) : null, positions: playerForm.positions });
        setPlayers(prev => [...prev, p]);
      }
      setPlayerModal(false);
      setEditingPlayer(null);
      setPlayerForm({ name: '', number: '', positions: [] });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function addGame(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editingGame) {
        const g = await api.put(`/games/${editingGame.id}`, gameForm);
        setGames(prev => prev.map(x => x.id === g.id ? g : x));
      } else {
        const g = await api.post('/games', { team_id: Number(teamId), ...gameForm });
        setGames(prev => [g, ...prev]);
      }
      setGameModal(false);
      setEditingGame(null);
      setGameForm({ opponent_name: '', location: '', game_date: '', game_time: '', home_away: 'home', notes: '', game_type: 'regular' });
    } catch (err) {
      if (err.upgrade_required) {
        setGameModal(false);
        setUpgradeModal({ limit: err.limit });
      } else {
        setError(err.message);
      }
    }
    finally { setSaving(false); }
  }

async function loadPlays() {
    setPlaysLoading(true);
    try {
      const p = await api.get(`/plays?team_id=${teamId}`);
      setPlays(p);
    } catch (err) { console.error(err); }
    finally { setPlaysLoading(false); }
  }

  async function savePlay(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPlay) {
        const p = await api.put(`/plays/${editingPlay.id}`, playForm);
        setPlays(prev => prev.map(pl => pl.id === p.id ? p : pl));
      } else {
        const p = await api.post('/plays', { team_id: Number(teamId), ...playForm });
        setPlays(prev => [...prev, p]);
      }
      setPlayModal(false);
      setEditingPlay(null);
      setPlayForm({ name: '', type: 'offense', season: team?.season || '', notes: '' });
    } catch (err) { setAlertModal(err.message); }
    finally { setSaving(false); }
  }

  function deletePlay(id) {
    setConfirmModal({
      message: 'Delete this play?',
      onConfirm: async () => {
        await api.del(`/plays/${id}`);
        setPlays(prev => prev.filter(p => p.id !== id));
      },
    });
  }

  async function copyPlays(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const newPlays = await api.post('/plays/copy', { team_id: Number(teamId), from_season: copyFromSeason, to_season: copyToSeason });
      setPlays(prev => [...prev, ...newPlays]);
      setCopyPlaysModal(false);
      setCopyFromSeason('');
      setCopyToSeason('');
    } catch (err) { setAlertModal(err.message); }
    finally { setSaving(false); }
  }

async function loadMembers() {
    if (!isAdmin) return;
    setMembersLoading(true);
    try {
      const m = await api.get(`/teams/${teamId}/members`);
      setMembers(m);
    } catch (err) { console.error(err); }
    finally { setMembersLoading(false); }
  }

  async function updateMemberRole(userId, role) {
    await api.put(`/teams/${teamId}/members/${userId}`, { role });
    setMembers(prev => prev.map(m => m.id === userId ? { ...m, role } : m));
  }

  function removeMember(userId, name) {
    setConfirmModal({
      message: `Remove ${name} from this team?`,
      onConfirm: async () => {
        await api.del(`/teams/${teamId}/members/${userId}`);
        setMembers(prev => prev.filter(m => m.id !== userId));
      },
    });
  }

  function toggleActive(player, e) {
    e.stopPropagation();
    if (player.active) {
      setConfirmModal({
        message: `Mark ${player.name} as inactive?`,
        onConfirm: async () => {
          const updated = await api.patch(`/players/${player.id}/active`, { active: false });
          setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
        },
      });
    } else {
      api.patch(`/players/${player.id}/active`, { active: true })
        .then(updated => setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p)));
    }
  }

  function parseCSV(text) {
    const lines = text.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const obj = {};
      headers.forEach((h, i) => obj[h] = vals[i] || '');
      const positions = obj.positions ? obj.positions.split('|').map(p => normalisePosition(p.trim())).filter(Boolean)
        : obj.position ? [normalisePosition(obj.position)] : [];
      return { name: obj.name || '', number: obj.number || '', positions };
    }).filter(p => p.name);
  }

  function handleCSVFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      if (!parsed.length) { setImportError('No valid players found. Check your CSV format.'); return; }
      setImportPreview(parsed);
    };
    reader.readAsText(file);
  }

  async function confirmImport() {
    setImporting(true);
    try {
      const { players: newPlayers } = await api.post('/players/import', { team_id: Number(teamId), players: importPreview });
      setPlayers(prev => [...prev, ...newPlayers]);
      setImportModal(false);
      setImportPreview([]);
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <div className="spinner" />;
  if (!team) return <div>Team not found</div>;

  const wins = games.filter(g => g.status === 'completed' && g.game_type !== 'friendly' && g.our_score > g.opponent_score).length;
  const losses = games.filter(g => g.status === 'completed' && g.game_type !== 'friendly' && g.our_score < g.opponent_score).length;

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.teamInfo}>
          <div className="page-title">{team.name}</div>
          {team.season && <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.06em' }}>{team.season}</span>}
        </div>
        <div className={styles.record}>
          <span className={styles.recordNum}>{wins}</span><span className={styles.recordSep}>-</span><span className={styles.recordNum}>{losses}</span>
          <span className={styles.recordLabel}>W-L</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'players' ? styles.activeTab : ''}`} onClick={() => setTab('players')}>
          Players ({players.filter(p => p.active).length})
        </button>
        <button className={`${styles.tab} ${tab === 'games' ? styles.activeTab : ''}`} onClick={() => setTab('games')}>
          Games ({games.length})
        </button>
        <button className={`${styles.tab} ${tab === 'leaderboard' ? styles.activeTab : ''}`} onClick={() => setTab('leaderboard')}>
          Leaderboard
        </button>
        {isAdmin && (
          <button className={`${styles.tab} ${tab === 'plays' ? styles.activeTab : ''}`} onClick={() => { setTab('plays'); loadPlays(); }}>
            Plays
          </button>
        )}
        {isAdmin && (
          <button className={`${styles.tab} ${tab === 'members' ? styles.activeTab : ''}`} onClick={() => { setTab('members'); loadMembers(); }}>
            Members
          </button>
        )}
      </div>

      {tab === 'players' && (
        <div>
          <div className={styles.playerToolbar}>
            <div className={styles.playerToolbarSort}>
              <button className={`btn btn-sm ${playerSort === 'number' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlayerSort('number')}># Number</button>
              <button className={`btn btn-sm ${playerSort === 'name' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlayerSort('name')}>A–Z</button>
            </div>
            {!isViewer && (
              <div className={styles.playerToolbarAdd}>
                <button className="btn btn-primary btn-sm" onClick={() => setAddPlayerMenuModal(true)}>+ Add</button>
              </div>
            )}
          </div>
          {players.length === 0 ? (
            <div className="empty-state"><div className="icon">👥</div><p>No players yet. Add your roster.</p></div>
          ) : (
            <div className={styles.playerGrid}>
              {[...players.filter(p => p.active)].sort((a, b) => playerSort === 'name' ? a.name.localeCompare(b.name) : (a.number ?? 999) - (b.number ?? 999)).map(p => (
                <div key={p.id} className={styles.playerCard} onClick={() => navigate(`/teams/${teamId}/players/${p.id}`)}>
                  <div className={styles.playerNum}>#{p.number ?? '—'}</div>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerName}>{p.name}</div>
                    {p.positions?.length > 0 && p.positions.map(pos => <span key={pos} className="tag tag-green">{pos}</span>)}
                  </div>
                  {!isViewer && (
                <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <button
                    className={`btn btn-ghost btn-sm ${styles.playerEditBtn}`}
                    onClick={e => { e.stopPropagation(); setEditingPlayer(p); setPlayerForm({ name: p.name, number: p.number || '', positions: p.positions || [] }); setPlayerModal(true); }}
                  >
                    Edit
                  </button>
                  <button className={`btn btn-sm ${p.active ? 'btn-success' : 'btn-secondary'}`} onClick={e => toggleActive(p, e)}>
                    {p.active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              )}
                </div>
              ))}
            {players.filter(p => !p.active).length > 0 && (
                <>
                  <div className="label-xs" style={{ width: '100%', marginTop: 16, marginBottom: 4 }}>Inactive / Injured</div>
                  {players.filter(p => !p.active).map(p => (
                    <div key={p.id} className={styles.playerCard} style={{ opacity: 0.5 }} onClick={() => navigate(`/teams/${teamId}/players/${p.id}`)}>
                      <div className={styles.playerNum}>#{p.number ?? '—'}</div>
                      <div className={styles.playerInfo}>
                        <div className={styles.playerName}>{p.name}</div>
                        {p.positions?.length > 0 && p.positions.map(pos => <span key={pos} className="tag tag-gray">{pos}</span>)}
                      </div>
                      {!isViewer && (
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button
                            className={`btn btn-ghost btn-sm ${styles.playerEditBtn}`}
                            onClick={e => { e.stopPropagation(); setEditingPlayer(p); setPlayerForm({ name: p.name, number: p.number || '', positions: p.positions || [] }); setPlayerModal(true); }}
                          >
                            Edit
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={e => toggleActive(p, e)}>Restore</button>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'games' && (
        <div>
          {!isViewer && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={() => setGameModal(true)}>+ Add Game</button>
            </div>
          )}
          {games.length === 0 ? (
            <div className="empty-state"><div className="icon">🏈</div><p>No games yet. Add your schedule.</p></div>
          ) : (
            <div className={styles.gameList}>
              {(() => {
                const today = new Date(); today.setHours(0,0,0,0);
                const upcoming = [...games]
                  .filter(g => { const d = new Date(g.game_date); d.setHours(0,0,0,0); return d >= today; })
                  .sort((a, b) => new Date(a.game_date) - new Date(b.game_date));
                const completed = [...games]
                  .filter(g => { const d = new Date(g.game_date); d.setHours(0,0,0,0); return d < today; })
                  .sort((a, b) => new Date(b.game_date) - new Date(a.game_date));

                const renderGame = g => {
                  const gameDate = new Date(g.game_date); gameDate.setHours(0,0,0,0);
                  const isToday = gameDate.getTime() === today.getTime();
                  const isPast = gameDate < today;
                  const won = isPast && g.our_score > g.opponent_score;
                  const lost = isPast && g.our_score < g.opponent_score;
                  return (
                    <div key={g.id} className={styles.gameCard} onClick={() => navigate(`/teams/${teamId}/games/${g.id}`)}>
                      <div className={styles.gameDate}>
                        <span>{format(new Date(g.game_date), 'EEE d MMM')}</span>
                        {g.game_time && <span className={styles.gameTime}>{g.game_time}</span>}
                      </div>
                      <div className={styles.gameVs}>
                        <div className={styles.gameOpponent}>vs {g.opponent_name}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2, alignItems: 'center' }}>
                          {g.location && <span className={styles.gameLocation}>📍 {g.location}</span>}
                          {g.game_type === 'friendly' && <span className="tag tag-gray" style={{ fontSize: '0.7rem' }}>Friendly</span>}
                          {g.game_type === 'playoff' && <span className="tag tag-gold" style={{ fontSize: '0.7rem' }}>Playoff</span>}
                          {g.game_type === 'finals' && <span className="tag tag-gold" style={{ fontSize: '0.7rem' }}>Finals</span>}
                        </div>
                      </div>
                      <div className={styles.gameRight}>
                        {isPast && (g.our_score > 0 || g.opponent_score > 0)
                          ? <div className={`${styles.score} ${won ? styles.win : lost ? styles.loss : ''}`}>{g.our_score}–{g.opponent_score}</div>
                          : isToday
                            ? <span className="tag tag-gold">🔴 Live</span>
                            : isPast
                              ? <span className="tag tag-gray">Completed</span>
                              : <span className="tag tag-gray">Scheduled</span>
                        }
                        <div className={styles.statCount}>{g.stat_count} stats</div>
                        {!isViewer && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginTop: 4 }}
                            onClick={e => {
                              e.stopPropagation();
                              setEditingGame(g);
                              setGameForm({
                                opponent_name: g.opponent_name,
                                location: g.location || '',
                                game_date: g.game_date,
                                game_time: g.game_time || '',
                                home_away: g.home_away || 'home',
                                notes: g.notes || '',
                                game_type: g.game_type || 'regular',
                              });
                              setGameModal(true);
                            }}
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                };

                return (
                  <>
                    {upcoming.length === 0 && completed.length === 0 && (
                      <div className="empty-state"><p>No games yet.</p></div>
                    )}
                    {upcoming.map(renderGame)}
                    {completed.length > 0 && (
                      <>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--gray-400)', fontSize: '0.85rem', margin: '8px 0' }}
                          onClick={() => setShowCompletedGames(p => !p)}
                        >
                          {showCompletedGames ? '↑ Hide' : '↓ Show'} {completed.length} completed game{completed.length === 1 ? '' : 's'}
                        </button>
                        {showCompletedGames && completed.map(renderGame)}
                      </>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {tab === 'plays' && isAdmin && (
        <div className={styles.playsLayout}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => { setEditingPlay(null); setPlayForm({ name: '', type: 'offense', season: team?.season || '', notes: '' }); setPlayModal(true); }}>+ Add Play</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setCopyPlaysModal(true)}>Copy from Season</button>
            </div>
          </div>

          {playsLoading ? <div className="spinner" /> : (
            <>
              {['offense', 'defense'].map(type => {
                const typePlays = plays.filter(p => p.type === type);
                return (
                  <div key={type} className={styles.playsBlock}>
                    <div className={styles.playsBlockTitle} style={{ color: type === 'offense' ? '#f5a623' : '#4a90d9' }}>
                      {type === 'offense' ? '⚔️ Offense' : '🛡️ Defense'}
                    </div>
                    {typePlays.length === 0 ? (
                      <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>No {type} plays yet.</p>
                    ) : (
                      typePlays.map(p => (
                        <div key={p.id} className={styles.playCard}>
                          <div className={styles.playInfo}>
                            <div className={styles.playName}>{p.name}</div>
                            <div className={styles.playSeason}>{p.season}</div>
                            {p.notes && <div className={styles.playNotes}>{p.notes}</div>}
                          </div>
                          <div className={styles.playActions}>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingPlay(p); setPlayForm({ name: p.name, type: p.type, season: p.season, notes: p.notes || '' }); setPlayModal(true); }}>Edit</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }} onClick={() => deletePlay(p.id)}>✕</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {playModal && (
        <Modal title={editingPlay ? 'Edit Play' : 'Add Play'} onClose={() => { setPlayModal(false); setEditingPlay(null); }}>
          <form onSubmit={savePlay}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Play Name *</label>
              <input className="form-control" value={playForm.name} onChange={e => setPlayForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. HB Sweep, Cover 2" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Type *</label>
              <select className="form-control" value={playForm.type} onChange={e => setPlayForm(p => ({ ...p, type: e.target.value }))}>
                <option value="offense">Offense</option>
                <option value="defense">Defense</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Season *</label>
              <input className="form-control" value={playForm.season} onChange={e => setPlayForm(p => ({ ...p, season: e.target.value }))} placeholder="e.g. 2026" maxLength={4} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Notes (optional)</label>
              <textarea className="form-control" rows={3} value={playForm.notes} onChange={e => setPlayForm(p => ({ ...p, notes: e.target.value }))} placeholder="Formation, assignment notes, etc." />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setPlayModal(false); setEditingPlay(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingPlay ? 'Save Changes' : 'Add Play'}</button>
            </div>
          </form>
        </Modal>
      )}

      {copyPlaysModal && (
        <Modal title="Copy Plays to New Season" onClose={() => setCopyPlaysModal(false)}>
          <form onSubmit={copyPlays}>
            <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem', marginBottom: 16 }}>
              Copy all plays from one season into another. Existing plays in the target season won't be affected.
            </p>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Copy from season *</label>
              <input className="form-control" value={copyFromSeason} onChange={e => setCopyFromSeason(e.target.value)} placeholder="e.g. 2025" maxLength={4} required />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Copy to season *</label>
              <input className="form-control" value={copyToSeason} onChange={e => setCopyToSeason(e.target.value)} placeholder="e.g. 2026" maxLength={4} required />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setCopyPlaysModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Copying...' : 'Copy Plays'}</button>
            </div>
          </form>
        </Modal>
      )}

      {tab === 'members' && isAdmin && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              <div className="label-xs" style={{ marginBottom: 8 }}>Join Code (coaches)</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--gold)' }}>{team.join_code}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
              <div className="label-xs" style={{ marginBottom: 8 }}>View Code (read-only)</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.1em', color: 'var(--gold)' }}>{team.view_code}</div>
            </div>
          </div>
          {membersLoading ? <div className="spinner" /> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.map(m => (
                <div key={m.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', rowGap: 10 }}>
                  {m.picture && <img src={m.picture} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />}
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--gray-300)' }}>{m.email}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexBasis: '100%', justifyContent: 'flex-start' }} className={styles.memberControls}>
                    <select
                      className="form-control"
                      style={{ width: 'auto', opacity: members.filter(m => m.role === 'admin').length === 1 && m.role === 'admin' ? 0.5 : 1 }}
                      value={m.role}
                      disabled={members.filter(m => m.role === 'admin').length === 1 && m.role === 'admin'}
                      title={members.filter(m => m.role === 'admin').length === 1 && m.role === 'admin' ? 'Promote another coach to admin first before changing this role' : undefined}
                      onChange={e => updateMemberRole(m.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="member">Coach</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {members.filter(x => x.role === 'admin').length === 1 && m.role === 'admin' ? (
                      <span style={{ fontSize: '0.78rem', color: 'var(--gray-300)', fontStyle: 'italic' }}>Promote another coach to admin first</span>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.id, m.name)}>Remove</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <LeaderboardTab teamId={teamId} onPlayerClick={playerId => navigate(`/teams/${teamId}/players/${playerId}`)} />
      )}

      {isAdmin && tab !== 'members' && tab !== 'plays' && (
        <div className="section-divider" style={{ marginTop: 48 }}>
          <div className="label-xs" style={{ marginBottom: 12 }}>Export</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
            {(tab === 'players') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const rows = [
                    ['Name', 'Number', 'Positions', 'Status'],
                    ...[...players].sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => [
                      p.name,
                      p.number ?? '',
                      (p.positions || []).join('|'),
                      p.active ? 'Active' : 'Inactive',
                    ])
                  ];
                  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${team.name} — Roster.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                ⬇ Roster CSV
              </button>
            )}
            {(tab === 'games' || tab === 'leaderboard') && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={async () => {
                  const { summary } = await api.get(`/stats/summary?team_id=${teamId}`);
                  const allStats = {};
                  summary.forEach(r => {
                    if (!allStats[r.name]) allStats[r.name] = { name: r.name, number: r.number };
                    allStats[r.name][r.stat_type] = r.total;
                  });
                  const statTypes = [...new Set(summary.map(r => r.stat_type))];
                  const rows = [
                    ['Name', 'Number', ...statTypes],
                    ...Object.values(allStats).sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => [
                      p.name,
                      p.number ?? '',
                      ...statTypes.map(s => p[s] ?? 0),
                    ])
                  ];
                  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${team.name} — Season Stats.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                ⬇ Season Stats CSV
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setEditTeamForm({ name: team.name, season: team.season || '', description: team.description || '', team_type: team.team_type || null });
                setEditTeamModal(true);
              }}
            >
              Edit Team
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setConfirmModal({
                  message: `Delete ${team.name}? This cannot be undone.`,
                  confirmLabel: 'Delete',
                  onConfirm: async () => {
                    await api.del(`/teams/${team.id}`);
                    navigate('/teams');
                  },
                });
              }}
            >
              Delete Team
            </button>
          </div>

        </div>
      )}

            {editTeamModal && (
        <Modal title="Edit Team" onClose={() => setEditTeamModal(false)}>
          <form onSubmit={async e => {
            e.preventDefault();
            const updated = await api.put(`/teams/${teamId}`, editTeamForm);
            setTeam(updated);
            setEditTeamModal(false);
          }}>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Team Name *</label>
              <input className="form-control" value={editTeamForm.name} onChange={e => setEditTeamForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Season</label>
              <input className="form-control" value={editTeamForm.season} onChange={e => setEditTeamForm(p => ({ ...p, season: e.target.value }))} placeholder="e.g. 2025" maxLength={4} />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Game Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${editTeamForm.team_type === 'flag' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditTeamForm(p => ({ ...p, team_type: p.team_type === 'flag' ? null : 'flag' }))}
                >
                  🚩 Flag
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${editTeamForm.team_type === 'contact' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditTeamForm(p => ({ ...p, team_type: p.team_type === 'contact' ? null : 'contact' }))}
                >
                  🏈 Contact
                </button>
                {editTeamForm.team_type && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)' }} onClick={() => setEditTeamForm(p => ({ ...p, team_type: null }))}>
                    Clear
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 6 }}>Filters positions and stats for your game type</p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description</label>
              <textarea className="form-control" rows={2} value={editTeamForm.description} onChange={e => setEditTeamForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditTeamModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}

      {addPlayerMenuModal && (
        <Modal title="Add Players" onClose={() => setAddPlayerMenuModal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                setAddPlayerMenuModal(false);
                setEditingPlayer(null);
                setPlayerForm({ name: '', number: '', positions: [] });
                setPlayerModal(true);
              }}
            >
              + Add Single Player
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setAddPlayerMenuModal(false);
                setImportPreview([]);
                setImportError('');
                setImportModal(true);
              }}
            >
              ⬆ Import from CSV
            </button>
          </div>
        </Modal>
      )}

      {/* Add Player Modal */}
      {playerModal && (
        <Modal title={editingPlayer ? 'Edit Player' : 'Add Player'} onClose={() => { setPlayerModal(false); setEditingPlayer(null); }}>
          <form onSubmit={addPlayer}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Name *</label>
              <input className="form-control" value={playerForm.name} onChange={e => setPlayerForm(p => ({ ...p, name: e.target.value }))} placeholder="Player name" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Jersey #</label>
              <input className="form-control" type="number" min="0" max="99" value={playerForm.number} onChange={e => setPlayerForm(p => ({ ...p, number: e.target.value }))} placeholder="e.g. 12" />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Positions</label>
                {team?.team_type === 'flag' && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }} onClick={() => setShowAllPositions(p => !p)}>
                    {showAllPositions ? 'Show fewer' : 'Show all positions'}
                  </button>
                )}
              </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {getPositionsForTeamType(team?.team_type, showAllPositions).map(pos => (
                    <button
                      key={pos}
                      type="button"
                      className={`btn btn-sm ${playerForm.positions.includes(pos) ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setPlayerForm(p => ({
                        ...p,
                        positions: p.positions.includes(pos)
                          ? p.positions.filter(x => x !== pos)
                          : [...p.positions, pos]
                      }))}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setPlayerModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingPlayer ? 'Save Changes' : 'Add Player'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Game Modal */}
      {gameModal && (
        <Modal title={editingGame ? 'Edit Game' : 'Add Game'} onClose={() => { setGameModal(false); setEditingGame(null); }}>
          <form onSubmit={addGame}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Opponent *</label>
              <input className="form-control" value={gameForm.opponent_name} onChange={e => setGameForm(p => ({ ...p, opponent_name: e.target.value }))} placeholder="Opponent team name" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Date *</label>
              <input className="form-control" type="date" value={gameForm.game_date} onChange={e => setGameForm(p => ({ ...p, game_date: e.target.value }))} required style={{ maxWidth: '100%', minWidth: 0 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Kick-off Time</label>
              <input className="form-control" type="time" value={gameForm.game_time} onChange={e => setGameForm(p => ({ ...p, game_time: e.target.value }))} style={{ maxWidth: '100%', minWidth: 0 }} />
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="form-group">
                <label>Location</label>
                <input className="form-control" value={gameForm.location} onChange={e => setGameForm(p => ({ ...p, location: e.target.value }))} placeholder="Stadium / field" />
              </div>
              <div className="form-group">
                <label>Home / Away</label>
                <select className="form-control" value={gameForm.home_away} onChange={e => setGameForm(p => ({ ...p, home_away: e.target.value }))}>
                  <option value="home">Home</option>
                  <option value="away">Away</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Game Type</label>
              <select className="form-control" value={gameForm.game_type} onChange={e => setGameForm(p => ({ ...p, game_type: e.target.value }))}>
                <option value="regular">Regular</option>
                <option value="friendly">Friendly (doesn't count for leaderboard)</option>
                <option value="playoff">Playoff</option>
                <option value="finals">Finals</option>
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Notes</label>
              <textarea className="form-control" rows={2} value={gameForm.notes} onChange={e => setGameForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setGameModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingGame ? 'Save Changes' : 'Add Game'}</button>
            </div>
          </form>
        </Modal>
      )}

{importModal && (
        <Modal title="Import Players from CSV" onClose={() => setImportModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem', marginBottom: 12 }}>
              Upload a CSV with columns: name, number, positions.<br />
              For multiple positions use a pipe separator e.g. QB|WR.{' '}
              <span
                style={{ color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline' }}
                onClick={() => {
                  const csv = `"name","number","positions"\n"Example Player","12","QB|WR"`;
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'player-import-template.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download template
              </span>
            </p>
            <input type="file" accept=".csv" className="form-control" onChange={handleCSVFile} />
          </div>
          {importError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{importError}</div>}
          {importPreview.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div className="label-xs" style={{ marginBottom: 8 }}>
                Preview — {importPreview.length} players found
              </div>
              <div style={{ maxHeight: 240, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {importPreview.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', fontWeight: 900, width: 32 }}>#{p.number || '—'}</span>
                    <span style={{ flex: 1, fontWeight: 600 }}>{p.name}</span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--gray-300)' }}>{p.positions.join(', ') || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setImportModal(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!importPreview.length || importing}
              onClick={confirmImport}
            >
              {importing ? 'Importing...' : `Import ${importPreview.length} Players`}
            </button>
          </div>
        </Modal>
      )}
      {upgradeModal && (
        <UpgradeModal
          limit={upgradeModal.limit}
          onCheckout={startCheckout}
          onClose={() => setUpgradeModal(null)}
        />
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
        activeKey={tab}
        items={[
          { key: 'players', label: 'Players', onClick: () => setTab('players'), icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
          { key: 'games', label: 'Games', onClick: () => setTab('games'), icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
          ...(isAdmin ? [{ key: 'plays', label: 'Plays', onClick: () => { setTab('plays'); loadPlays(); }, icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></> }] : []),
          { key: 'leaderboard', label: 'Leaders', onClick: () => setTab('leaderboard'), icon: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> },
          ...(isAdmin ? [{ key: 'members', label: 'Members', onClick: () => { setTab('members'); loadMembers(); }, icon: <><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></> }] : []),
        ]}
      />
      <div className="bottom-nav-padding" />
    </div>
  );
}