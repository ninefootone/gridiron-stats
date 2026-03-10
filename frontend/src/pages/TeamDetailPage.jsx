import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import { POSITIONS } from '../utils/stats';
import { format } from 'date-fns';
import styles from './TeamDetailPage.module.css';

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const api = useApi();
  const [team, setTeam] = useState(null);
  const isViewer = team?.my_role === 'viewer';
  const isAdmin = team?.my_role === 'admin';
  const [players, setPlayers] = useState([]);
  const [games, setGames] = useState([]);
  const [tab, setTab] = useState('players');
  const [playerSort, setPlayerSort] = useState('number');
  const [loading, setLoading] = useState(true);

  // Modals
  const [playerModal, setPlayerModal] = useState(false);
  const [gameModal, setGameModal] = useState(false);
  const [playerForm, setPlayerForm] = useState({ name: '', number: '', positions: [] });
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [gameForm, setGameForm] = useState({ opponent_name: '', location: '', game_date: '', game_time: '', home_away: 'home', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      const g = await api.post('/games', { team_id: Number(teamId), ...gameForm });
      setGames(prev => [g, ...prev]);
      setGameModal(false);
      setGameForm({ opponent_name: '', location: '', game_date: '', game_time: '', home_away: 'home', notes: '' });
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function deletePlayer(id, e) {
    e.stopPropagation();
    if (!confirm('Remove this player?')) return;
    await api.del(`/players/${id}`);
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  async function toggleActive(player, e) {
    e.stopPropagation();
    const updated = await api.patch(`/players/${player.id}/active`, { active: !player.active });
    setPlayers(prev => prev.map(p => p.id === updated.id ? updated : p));
  }

  if (loading) return <div className="spinner" />;
  if (!team) return <div>Team not found</div>;

  const wins = games.filter(g => g.status === 'completed' && g.our_score > g.opponent_score).length;
  const losses = games.filter(g => g.status === 'completed' && g.our_score < g.opponent_score).length;

  return (
    <div>
      <div className={styles.header}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/teams')}>← Back</button>
        <div className={styles.teamInfo}>
          <div className="page-title">{team.name}</div>
          {team.season && <span className="tag tag-gold">{team.season}</span>}
          {isAdmin && (
            <button
              className="btn btn-danger btn-sm"
              style={{ marginTop: 8, alignSelf: 'flex-start' }}
              onClick={async () => {
                if (!confirm(`Delete ${team.name}? This cannot be undone.`)) return;
                await api.del(`/teams/${team.id}`);
                navigate('/teams');
              }}
            >
              Delete Team
            </button>
          )}
        </div>
        <div className={styles.record}>
          <span className={styles.recordNum}>{wins}</span><span className={styles.recordSep}>-</span><span className={styles.recordNum}>{losses}</span>
          <span className={styles.recordLabel}>W-L</span>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'players' ? styles.activeTab : ''}`} onClick={() => setTab('players')}>
          Players ({players.length})
        </button>
        <button className={`${styles.tab} ${tab === 'games' ? styles.activeTab : ''}`} onClick={() => setTab('games')}>
          Games ({games.length})
        </button>
        <button className={`${styles.tab} ${tab === 'leaderboard' ? styles.activeTab : ''}`} onClick={() => navigate(`/teams/${teamId}/leaderboard`)}>
          Leaderboard
        </button>
      </div>

      {tab === 'players' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`btn btn-sm ${playerSort === 'number' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlayerSort('number')}># Number</button>
              <button className={`btn btn-sm ${playerSort === 'name' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlayerSort('name')}>A–Z</button>
            </div>
            {!isViewer && (
              <button className="btn btn-primary" onClick={() => { setEditingPlayer(null); setPlayerForm({ name: '', number: '', positions: [] }); setPlayerModal(true); }}>+ Add Player</button>
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
                  <button className="btn btn-secondary btn-sm" onClick={e => toggleActive(p, e)}>
                    {p.active ? 'Inactive' : 'Restore'}
                  </button>
                </div>
              )}
                </div>
              ))}
            {players.filter(p => !p.active).length > 0 && (
                <>
                  <div style={{ width: '100%', fontSize: '0.78rem', color: 'var(--gray-300)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 16, marginBottom: 4 }}>Inactive / Injured</div>
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
              {games.map(g => {
                const isCompleted = g.status === 'completed';
                const won = isCompleted && g.our_score > g.opponent_score;
                const lost = isCompleted && g.our_score < g.opponent_score;
                return (
                  <div key={g.id} className={styles.gameCard} onClick={() => navigate(`/teams/${teamId}/games/${g.id}`)}>
                    <div className={styles.gameDate}>
                      <span>{format(new Date(g.game_date), 'EEE d MMM')}</span>
                      {g.game_time && <span className={styles.gameTime}>{g.game_time}</span>}
                    </div>
                    <div className={styles.gameVs}>
                      <div className={styles.gameOpponent}>vs {g.opponent_name}</div>
                      {g.location && <div className={styles.gameLocation}>📍 {g.location}</div>}
                    </div>
                    <div className={styles.gameRight}>
                      {isCompleted
                        ? <div className={`${styles.score} ${won ? styles.win : lost ? styles.loss : ''}`}>{g.our_score}–{g.opponent_score}</div>
                        : <span className={`tag ${g.status === 'in_progress' ? 'tag-gold' : 'tag-gray'}`}>{g.status === 'in_progress' ? '🔴 Live' : 'Scheduled'}</span>
                      }
                      <div className={styles.statCount}>{g.stat_count} stats</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
              <label>Positions</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {POSITIONS.map(pos => (
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
        <Modal title="Add Game" onClose={() => setGameModal(false)}>
          <form onSubmit={addGame}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Opponent *</label>
              <input className="form-control" value={gameForm.opponent_name} onChange={e => setGameForm(p => ({ ...p, opponent_name: e.target.value }))} placeholder="Opponent team name" required />
            </div>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="form-group">
                <label>Date *</label>
                <input className="form-control" type="date" value={gameForm.game_date} onChange={e => setGameForm(p => ({ ...p, game_date: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Kick-off Time</label>
                <input className="form-control" type="time" value={gameForm.game_time} onChange={e => setGameForm(p => ({ ...p, game_time: e.target.value }))} />
              </div>
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
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Notes</label>
              <textarea className="form-control" rows={2} value={gameForm.notes} onChange={e => setGameForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setGameModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Adding...' : 'Add Game'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
