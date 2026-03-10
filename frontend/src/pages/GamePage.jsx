import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import { STAT_CATEGORIES, COUNTING_STATS, getStatInfo } from '../utils/stats';
import { format } from 'date-fns';
import styles from './GamePage.module.css';

export default function GamePage() {
  const { teamId, gameId } = useParams();
  const navigate = useNavigate();
  const api = useApi();

  const [game, setGame] = useState(null);
  const [teamRole, setTeamRole] = useState(null);
  const [playerSort, setPlayerSort] = useState('number');
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stat logging
  const [statModal, setStatModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedStat, setSelectedStat] = useState(null);
  const [statValue, setStatValue] = useState('');
  const [statNotes, setStatNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Stat-first flow
  const [statFirstModal, setStatFirstModal] = useState(false);
  const [sfStat, setSfStat] = useState(null);
  const [sfPlayer, setSfPlayer] = useState(null);
  const [sfPasser, setSfPasser] = useState(null);
  const [sfReceiver, setSfReceiver] = useState(null);
  const [sfPickSix, setSfPickSix] = useState(false);
  const [sfReturnPlayer, setSfReturnPlayer] = useState(null);
  const [sfNotes, setSfNotes] = useState('');
  const [sfStep, setSfStep] = useState(1); // 1 = pick stat, 2 = pick player(s)

  function openStatFirst() {
    setSfStat(null); setSfPlayer(null); setSfPasser(null); setSfReceiver(null);
    setSfPickSix(false); setSfReturnPlayer(null); setSfNotes(''); setSfStep(1);
    setStatFirstModal(true);
  }

  async function logStatFirst() {
    setSaving(true);
    try {
      const toLog = [];
      if (sfStat === 'td_passing') {
        if (sfPasser) toLog.push({ player: sfPasser, stat_type: 'td_passing' });
        if (sfReceiver) toLog.push({ player: sfReceiver, stat_type: 'td_receiving' });
      } else if (sfStat === 'interception') {
        if (sfPlayer) toLog.push({ player: sfPlayer, stat_type: 'interception' });
        if (sfPickSix && sfReturnPlayer) toLog.push({ player: sfReturnPlayer, stat_type: 'td_return' });
      } else {
        if (sfPlayer) toLog.push({ player: sfPlayer, stat_type: sfStat });
      }
      const results = await Promise.all(toLog.map(({ player, stat_type }) =>
        api.post('/stats', { game_id: Number(gameId), player_id: player.id, stat_type, value: 1, notes: sfNotes || null })
          .then(s => ({ ...s, player_name: player.name, player_number: player.number }))
      ));
      setStats(prev => [...results.reverse(), ...prev]);
      setStatFirstModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  // Score edit
  const [scoreModal, setScoreModal] = useState(false);
  const [scoreForm, setScoreForm] = useState({ our_score: 0, opponent_score: 0, game_type: 'regular' });

  useEffect(() => {
    Promise.all([
      api.get(`/games/${gameId}`),
      api.get(`/players?team_id=${teamId}`),
      api.get(`/stats?game_id=${gameId}`),
      api.get(`/teams/${teamId}`),
    ]).then(([g, p, s, t]) => { setGame(g); setPlayers(p); setStats(s); setTeamRole(t.my_role); setScoreForm({ our_score: g.our_score ?? '', opponent_score: g.opponent_score ?? '', game_type: g.game_type || 'regular' }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gameId, teamId]);

  function openStatModal(player) {
    setSelectedPlayer(player);
    setSelectedStat(null);
    setStatValue('');
    setStatNotes('');
    setStatModal(true);
  }

  async function logStat(e) {
    e.preventDefault();
    if (!selectedStat) return;
    setSaving(true);
    try {
      const statDef = getStatInfo(selectedStat);
      const val = statDef.unit ? (Number(statValue) || 0) : 1;
      const s = await api.post('/stats', {
        game_id: Number(gameId),
        player_id: selectedPlayer.id,
        stat_type: selectedStat,
        value: val,
        notes: statNotes || null,
      });
      setStats(prev => [{ ...s, player_name: selectedPlayer.name, player_number: selectedPlayer.number, player_position: selectedPlayer.position }, ...prev]);
      setStatModal(false);
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  }

  async function deleteStat(id) {
    if (!confirm('Remove this stat?')) return;
    await api.del(`/stats/${id}`);
    setStats(prev => prev.filter(s => s.id !== id));
  }

  async function updateScore(e) {
    e.preventDefault();
    const g = await api.put(`/games/${gameId}`, {
      ...scoreForm,
      our_score: scoreForm.our_score === '' ? 0 : Number(scoreForm.our_score),
      opponent_score: scoreForm.opponent_score === '' ? 0 : Number(scoreForm.opponent_score),
      game_type: scoreForm.game_type,
    });
    setGame(g);
    setScoreModal(false);
  }

  if (loading) return <div className="spinner" />;
  if (!game) return <div>Game not found</div>;

  // Group stats by player
  const statsByPlayer = {};
  stats.forEach(s => {
    const key = s.player_id;
    if (!statsByPlayer[key]) statsByPlayer[key] = { player_name: s.player_name, player_number: s.player_number, stats: [] };
    statsByPlayer[key].stats.push(s);
  });

  const homeAway = game.home_away === 'home' ? '🏠 Home' : game.home_away === 'away' ? '✈️ Away' : '⚖️ Neutral';
  const isViewer = teamRole === 'viewer';
  const isAdmin = teamRole === 'admin';
  const gameTypeLabel = { friendly: 'Friendly', playoff: 'Playoff', finals: 'Finals' }[game.game_type];
  const today = new Date(); today.setHours(0,0,0,0);
  const gameDate = new Date(game.game_date); gameDate.setHours(0,0,0,0);
  const isToday = gameDate.getTime() === today.getTime();
  const isPast = gameDate < today;

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate(`/teams/${teamId}`)}>← Back to Team</button>

      {/* Game Header */}
      <div className={styles.gameHeader}>
        <div className={styles.gameInfo}>
          <div className={styles.gameTitle}>vs {game.opponent_name}</div>
          <div className={styles.gameMeta}>
            {format(new Date(game.game_date), 'EEEE d MMMM yyyy')}
            {game.game_time && ` · ${game.game_time}`}
            {game.location && ` · 📍 ${game.location}`}
            {` · ${homeAway}`}
            {gameTypeLabel && <span className="tag tag-gold" style={{ marginLeft: 8 }}>{gameTypeLabel}</span>}
            {game.game_type === 'friendly' && <span className="tag tag-gray" style={{ marginLeft: 4 }}>Doesn't count for leaderboard</span>}
          </div>
        </div>
        <div className={styles.scoreBox} onClick={() => teamRole === 'admin' && setScoreModal(true)} style={teamRole !== 'admin' ? { cursor: 'default' } : {}}>
          <div className={styles.scoreInner}>
            <div className={styles.scoreNum}>{game.our_score}</div>
            <div className={styles.scoreDash}>–</div>
            <div className={styles.scoreNum}>{game.opponent_score}</div>
          </div>
          {teamRole === 'admin' && <div className={styles.scoreTap}>Tap to update score & type</div>}

          <span className={`tag ${isToday ? 'tag-gold' : isPast ? 'tag-green' : 'tag-gray'}`} style={{ marginTop: 4 }}>
            {isToday ? '🔴 Live' : isPast ? 'Final' : 'Scheduled'}
          </span>
        </div>
      </div>

      {!isViewer && (
        <div style={{ margin: '12px 0', display: 'flex', gap: 8 }}>
          <button className={`btn btn-primary ${styles.logStatBtn}`} onClick={openStatFirst}>⚡ Log Stat</button>
          {isAdmin && (
            <button className="btn btn-danger btn-sm" onClick={async () => {
              if (!confirm('Delete this game and all its stats? This cannot be undone.')) return;
              await api.del(`/games/${gameId}`);
              navigate(`/teams/${teamId}`);
            }}>Delete Game</button>
          )}
        </div>
      )}

      <div className={styles.layout}>
        {/* Player roster */}
        <div className={styles.roster}>
          <div className={styles.rosterHeader}>
            <div className={styles.sectionTitle} style={{ marginBottom: 0 }}>{isViewer ? 'Roster' : 'Roster — Tap to Log Stat'}</div>
            <div className={styles.rosterSort}>
              <button className={`btn btn-sm ${playerSort === 'number' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlayerSort('number')}>#</button>
              <button className={`btn btn-sm ${playerSort === 'name' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPlayerSort('name')}>A–Z</button>
            </div>
          </div>
          {[...players.filter(p => p.active)].sort((a, b) => playerSort === 'name' ? a.name.localeCompare(b.name) : (a.number ?? 999) - (b.number ?? 999)).map(p => (
            <button key={p.id} className={styles.rosterBtn} onClick={() => !isViewer && openStatModal(p)} style={isViewer ? { cursor: 'default', opacity: 0.7 } : {}}>
              <span className={styles.rosterNum}>#{p.number ?? '—'}</span>
              <span className={styles.rosterName}>{p.name}</span>
              <span className={styles.rosterPlus}>+</span>
            </button>
          ))}
        </div>

        {/* Live stat feed */}
        <div className={styles.feed}>
          <div className={styles.sectionTitle}>Live Stats ({stats.length})</div>
          {stats.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <p>No stats yet. Tap a player to log a play.</p>
            </div>
          ) : (
            <div className={styles.statList}>
              {stats.map(s => {
                const info = getStatInfo(s.stat_type);
                return (
                  <div key={s.id} className={styles.statRow}>
                    <span className={styles.statIcon}>{info.icon}</span>
                    <div className={styles.statContent}>
                      <div className={styles.statMainRow}>
                        <span className={styles.statPlayer}>#{s.player_number} {s.player_name}</span>
                        <span className={styles.statLabel}>{info.label}</span>
                        {info.unit && <span className={styles.statVal}>{s.value} {info.unit}</span>}
                      </div>
                      {s.notes && <div className={styles.statNotes}>{s.notes}</div>}
                    </div>
                    {!isViewer && <button className={styles.statDel} onClick={() => deleteStat(s.id)}>✕</button>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary by player */}
          {Object.keys(statsByPlayer).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>Game Summary</div>
              {Object.values(statsByPlayer).map(({ player_name, player_number, stats: ps }) => (
                <div key={player_name} className={styles.summaryCard}>
                  <div className={styles.summaryPlayer}>#{player_number} {player_name}</div>
                  <div className={styles.summaryStats}>
                    {Object.entries(
                      ps.reduce((acc, s) => { acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value); return acc; }, {})
                    ).map(([type, total]) => {
                      const info = getStatInfo(type);
                      return (
                        <span key={type} className="stat-badge">
                          {info.icon} {info.label}: {total}{info.unit ? ` ${info.unit}` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Log Stat Modal */}
      {statModal && selectedPlayer && (
        <Modal title={`Log Stat — #${selectedPlayer.number} ${selectedPlayer.name}`} onClose={() => setStatModal(false)} wide>
          <form onSubmit={logStat}>
            <div className={styles.statCategories}>
              {Object.entries(STAT_CATEGORIES).map(([catKey, cat]) => (
                <div key={catKey}>
                  <div className={styles.catLabel} style={{ color: cat.color }}>{cat.label}</div>
                  <div className={styles.statGrid}>
                    {cat.stats.map(s => (
                      <button
                        key={s.key}
                        type="button"
                        className={`${styles.statBtn} ${selectedStat === s.key ? styles.statBtnActive : ''}`}
                        style={selectedStat === s.key ? { borderColor: cat.color, background: `${cat.color}22` } : {}}
                        onClick={() => setSelectedStat(s.key)}
                      >
                        <span className={styles.statBtnIcon}>{s.icon}</span>
                        <span className={styles.statBtnLabel}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {selectedStat && getStatInfo(selectedStat).unit && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Yards / Value</label>
                <input className="form-control" type="number" value={statValue} onChange={e => setStatValue(e.target.value)} placeholder="e.g. 35" autoFocus />
              </div>
            )}
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>Notes (optional)</label>
              <input className="form-control" value={statNotes} onChange={e => setStatNotes(e.target.value)} placeholder="e.g. Red zone TD, 2nd quarter" />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setStatModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={!selectedStat || saving}>{saving ? 'Logging...' : 'Log Stat'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Stat-First Modal */}
      {statFirstModal && (
        <Modal title="Log Stat" onClose={() => setStatFirstModal(false)} wide>
          {sfStep === 1 && (
            <div>
              <div style={{ marginBottom: 12, color: 'var(--gray-300)', fontSize: '0.9rem' }}>Choose a stat type:</div>
              <div className={styles.statCategories}>
                {Object.entries(STAT_CATEGORIES).map(([catKey, cat]) => {
                  const countingInCat = cat.stats.filter(s => s.unit === null);
                  if (!countingInCat.length) return null;
                  return (
                    <div key={catKey}>
                      <div className={styles.catLabel} style={{ color: cat.color }}>{cat.label}</div>
                      <div className={styles.statGrid}>
                        {countingInCat.map(s => (
                          <button
                            key={s.key}
                            type="button"
                            className={`${styles.statBtn} ${sfStat === s.key ? styles.statBtnActive : ''}`}
                            style={sfStat === s.key ? { borderColor: cat.color, background: `${cat.color}22` } : {}}
                            onClick={() => { setSfStat(s.key); setSfStep(2); setSfPlayer(null); setSfPasser(null); setSfReceiver(null); setSfPickSix(false); setSfReturnPlayer(null); }}
                          >
                            <span className={styles.statBtnIcon}>{s.icon}</span>
                            <span className={styles.statBtnLabel}>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatFirstModal(false)}>Cancel</button>
              </div>
            </div>
          )}

          {sfStep === 2 && sfStat && (
            <div>
              <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }} onClick={() => setSfStep(1)}>← Back</button>
              <div style={{ marginBottom: 16, fontWeight: 700, fontSize: '1.1rem' }}>
                {getStatInfo(sfStat).icon} {getStatInfo(sfStat).label}
              </div>

              {sfStat === 'td_passing' ? (
                <>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Passer (optional)</label>
                    <select className="form-control" value={sfPasser?.id || ''} onChange={e => setSfPasser(players.find(p => String(p.id) === e.target.value) || null)}>
                      <option value="">— Select passer —</option>
                      {[...players.filter(p => p.active)].sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => (
                        <option key={p.id} value={p.id}>#{p.number ?? '—'} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Receiver (optional)</label>
                    <select className="form-control" value={sfReceiver?.id || ''} onChange={e => setSfReceiver(players.find(p => String(p.id) === e.target.value) || null)}>
                      <option value="">— Select receiver —</option>
                      {[...players.filter(p => p.active)].sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => (
                        <option key={p.id} value={p.id}>#{p.number ?? '—'} {p.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : sfStat === 'interception' ? (
                <>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Player</label>
                    <select className="form-control" value={sfPlayer?.id || ''} onChange={e => setSfPlayer(players.find(p => String(p.id) === e.target.value) || null)}>
                      <option value="">— Select player —</option>
                      {[...players.filter(p => p.active)].sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => (
                        <option key={p.id} value={p.id}>#{p.number ?? '—'} {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input type="checkbox" checked={sfPickSix} onChange={e => { setSfPickSix(e.target.checked); if (!e.target.checked) setSfReturnPlayer(null); }} />
                      Pick 6? (log a Return TD)
                    </label>
                  </div>
                  {sfPickSix && (
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label>Return TD Player (optional)</label>
                      <select className="form-control" value={sfReturnPlayer?.id || ''} onChange={e => setSfReturnPlayer(players.find(p => String(p.id) === e.target.value) || null)}>
                        <option value="">— Same as interceptor or select —</option>
                        {[...players.filter(p => p.active)].sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => (
                          <option key={p.id} value={p.id}>#{p.number ?? '—'} {p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>Player</label>
                  <select className="form-control" value={sfPlayer?.id || ''} onChange={e => setSfPlayer(players.find(p => String(p.id) === e.target.value) || null)}>
                    <option value="">— Select player —</option>
                    {[...players.filter(p => p.active)].sort((a, b) => (a.number ?? 999) - (b.number ?? 999)).map(p => (
                      <option key={p.id} value={p.id}>#{p.number ?? '—'} {p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Notes (optional)</label>
                <input className="form-control" value={sfNotes} onChange={e => setSfNotes(e.target.value)} placeholder="e.g. Red zone TD, 2nd quarter" />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatFirstModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || (sfStat === 'td_passing' ? (!sfPasser && !sfReceiver) : sfStat === 'interception' ? !sfPlayer : !sfPlayer)}
                  onClick={logStatFirst}
                >
                  {saving ? 'Logging...' : 'Log Stat'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Score Modal */}
      {scoreModal && (
        <Modal title="Update Score" onClose={() => setScoreModal(false)}>
          <form onSubmit={updateScore}>
            <div className="grid-2" style={{ marginBottom: 14 }}>
              <div className="form-group">
                <label>Our Score</label>
                <input className="form-control" type="number" min="0" value={scoreForm.our_score} onChange={e => setScoreForm(p => ({ ...p, our_score: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Opponent Score</label>
                <input className="form-control" type="number" min="0" value={scoreForm.opponent_score} onChange={e => setScoreForm(p => ({ ...p, opponent_score: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label>Game Type</label>
              <select className="form-control" value={scoreForm.game_type} onChange={e => setScoreForm(p => ({ ...p, game_type: e.target.value }))}>
                <option value="regular">Regular</option>
                <option value="friendly">Friendly (doesn't count for leaderboard)</option>
                <option value="playoff">Playoff</option>
                <option value="finals">Finals</option>
              </select>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setScoreModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
