import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import styles from './GamePage.module.css';
import { useGameSocket } from '../hooks/useGameSocket';
import { useWhistleSocket } from '../hooks/useWhistleSocket';
import WhistleStrip from '../components/shared/WhistleStrip';
import BottomNav from '../components/shared/BottomNav';
import jsQR from 'jsqr';
import { STAT_CATEGORIES, getStatInfo, ALL_STATS, getStatsForTeamType } from '../utils/stats';
import ConfirmModal, { AlertModal } from '../components/shared/ConfirmModal';

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
  const [plays, setPlays] = useState([]);
  const [selectedPlay, setSelectedPlay] = useState(null);
  const [sfPlay, setSfPlay] = useState(null);
  const [opponentStats, setOpponentStats] = useState([]);
  const [opponentModal, setOpponentModal] = useState(false);
  const [opponentSaving, setOpponentSaving] = useState(false);
  const [scoreAdjustments, setScoreAdjustments] = useState([]);
  const [adjustModal, setAdjustModal] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ team: 'ours', adjustment: '', reason: '' });
  const [adjustSaving, setAdjustSaving] = useState(false);
  const [whistleGameId, setWhistleGameId] = useState(null);
  const [whistleModal, setWhistleModal] = useState(false);
  const [whistleInput, setWhistleInput] = useState('');
  const [whistleSaving, setWhistleSaving] = useState(false);
  const [qrScanning, setQrScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const [qrSuccess, setQrSuccess] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);

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

  const [teamType, setTeamType] = useState(null);
  const [showMoreStats, setShowMoreStats] = useState(false);
  
  function openStatFirst() {
    setSfStat(null); setSfPlayer(null); setSfPasser(null); setSfReceiver(null);
    setSfPickSix(false); setSfReturnPlayer(null); setSfNotes(''); setSfStep(1); setSfPlay(null);
    setStatFirstModal(true);
  }

  async function logStatFirst() {
    setSaving(true);
    try {
      const toLog = [];
      if (sfStat === 'td_passing') {
        if (sfPasser) toLog.push({ player: sfPasser, stat_type: 'td_passing' });
        if (sfReceiver) toLog.push({ player: sfReceiver, stat_type: 'td_receiving' });
      } else if (sfStat === 'two_pt_pass') {
        if (sfPasser) toLog.push({ player: sfPasser, stat_type: 'two_pt_pass' });
        if (sfReceiver) toLog.push({ player: sfReceiver, stat_type: 'two_pt_rec' });
      } else if (sfStat === 'one_pt_pass') {
        if (sfPasser) toLog.push({ player: sfPasser, stat_type: 'one_pt_pass' });
        if (sfReceiver) toLog.push({ player: sfReceiver, stat_type: 'one_pt_rec' });
      } else if (sfStat === 'interception') {
        if (sfPlayer) toLog.push({ player: sfPlayer, stat_type: 'interception' });
        if (sfPickSix && sfReturnPlayer) toLog.push({ player: sfReturnPlayer, stat_type: 'td_return' });
      } else {
        if (sfPlayer) toLog.push({ player: sfPlayer, stat_type: sfStat });
      }
      const results = await Promise.all(toLog.map(({ player, stat_type }) =>
      api.post('/stats', { game_id: Number(gameId), player_id: player.id, stat_type, value: 1, notes: sfNotes || null, play_id: sfPlay || null })
          .then(s => ({ ...s, player_name: player.name, player_number: player.number, play_name: plays.find(p => p.id === sfPlay)?.name || null }))
      ));
      const lastWithScore = results.slice().reverse().find(r => r.our_score !== null && r.our_score !== undefined);
      if (lastWithScore) setGame(prev => ({ ...prev, our_score: lastWithScore.our_score }));
      setStatFirstModal(false);
    } catch (err) { setAlertModal(err.message); }
    finally { setSaving(false); }
  }

  async function refreshGame() {
    const [g, s, os, sa] = await Promise.all([
      api.get(`/games/${gameId}`),
      api.get(`/stats?game_id=${gameId}`),
      api.get(`/opponent-stats?game_id=${gameId}`),
      api.get(`/score-adjustments?game_id=${gameId}`),
    ]);
    setGame(g);
    setStats(s);
    setOpponentStats(os);
    setScoreAdjustments(sa);
    setScoreForm({ our_score: g.our_score ?? '', opponent_score: g.opponent_score ?? '', game_type: g.game_type || 'regular' });
  }

  useGameSocket(gameId, {
    stat_added: ({ stat }) => {
      setStats(prev => {
        if (prev.find(s => Number(s.id) === Number(stat.id))) return prev;
        return [stat, ...prev];
      });
      if (stat.our_score !== null && stat.our_score !== undefined) {
        setGame(prev => ({ ...prev, our_score: stat.our_score }));
      }
    },
    stat_deleted: ({ stat_id, our_score }) => {
      setStats(prev => prev.filter(s => s.id !== stat_id));
      if (our_score !== null && our_score !== undefined) {
        setGame(prev => ({ ...prev, our_score }));
      }
    },
    opponent_score_added: ({ stat, opponent_score }) => {
      setOpponentStats(prev => {
        if (prev.find(s => Number(s.id) === Number(stat.id))) return prev;
        return [stat, ...prev];
      });
      setGame(prev => ({ ...prev, opponent_score }));
    },
    opponent_score_deleted: ({ stat_id, opponent_score }) => {
      setOpponentStats(prev => prev.filter(s => s.id !== stat_id));
      setGame(prev => ({ ...prev, opponent_score }));
    },
    adjustment_added: ({ adjustment, our_score, opponent_score }) => {
      setScoreAdjustments(prev => {
        if (prev.find(a => Number(a.id) === Number(adjustment.id))) return prev;
        return [...prev, adjustment];
      });
      if (our_score !== null && our_score !== undefined) setGame(prev => ({ ...prev, our_score }));
      if (opponent_score !== null && opponent_score !== undefined) setGame(prev => ({ ...prev, opponent_score }));
    },
    adjustment_deleted: ({ adjustment_id, our_score, opponent_score }) => {
      setScoreAdjustments(prev => prev.filter(a => a.id !== adjustment_id));
      if (our_score !== null && our_score !== undefined) setGame(prev => ({ ...prev, our_score }));
      if (opponent_score !== null && opponent_score !== undefined) setGame(prev => ({ ...prev, opponent_score }));
    },
    game_status_changed: ({ game_status }) => {
      setGame(prev => ({ ...prev, game_status }));
    },
  });

  const { whistleState, connected: whistleConnected } = useWhistleSocket(whistleGameId);

  function parseWhistleId(input) {
    try {
      const url = new URL(input);
      const id = url.pathname.split('/game/')[1]?.split('?')[0];
      return id && id.length >= 4 ? id : null;
    } catch {
      const trimmed = input.trim();
      return trimmed.length >= 4 && trimmed.length <= 10 && /^[a-z0-9]+$/.test(trimmed) ? trimmed : null;
    }
  }


  function startQrScan() {
    setQrScanning(true);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          scanIntervalRef.current = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
              stopQrScan();
              setWhistleInput(code.data);
              setQrSuccess(true);
              setTimeout(() => setQrSuccess(false), 2000);
            }
          }, 500);
        }
      })
      .catch(() => {
        setQrScanning(false);
        setAlertModal('Camera access denied or not available.');
      });
  }

  function stopQrScan() {
    clearInterval(scanIntervalRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setQrScanning(false);
  }

  const OPPONENT_SCORE_TYPES = [
    { key: 'touchdown', label: 'Touchdown', value: 6, icon: '🏈' },
    { key: 'one_xp', label: '1XP', value: 1, icon: '🎯' },
    { key: 'two_xp', label: '2XP', value: 2, icon: '💪' },
    { key: 'safety', label: 'Safety', value: 2, icon: '🛡️' },
    { key: 'field_goal', label: 'Field Goal', value: 3, icon: '🏹' },
  ];

  async function logOpponentScore(stat_type) {
    setOpponentSaving(true);
    try {
      const { opponent_score } = await api.post('/opponent-stats', { game_id: Number(gameId), stat_type });
      setGame(prev => ({ ...prev, opponent_score }));
    } catch (err) { setAlertModal(err.message); }
    finally { setOpponentSaving(false); setOpponentModal(false); }
  }

  function deleteOpponentStat(id) {
    setConfirmModal({
      message: 'Remove this opponent score?',
      onConfirm: async () => {
        const { opponent_score } = await api.del(`/opponent-stats/${id}`);
        setOpponentStats(prev => prev.filter(s => s.id !== id));
        setGame(prev => ({ ...prev, opponent_score }));
      }
    });
  }

  // Score edit
  const [scoreModal, setScoreModal] = useState(false);
  const [scoreForm, setScoreForm] = useState({ our_score: 0, opponent_score: 0, game_type: 'regular' });

  useEffect(() => {
    if (game?.whistle_game_id) setWhistleGameId(game.whistle_game_id);
  }, [game?.whistle_game_id]);

  useEffect(() => {
    Promise.all([
      api.get(`/games/${gameId}`),
      api.get(`/players?team_id=${teamId}`),
      api.get(`/stats?game_id=${gameId}`),
      api.get(`/teams/${teamId}`),
      api.get(`/plays?team_id=${teamId}`),
      api.get(`/opponent-stats?game_id=${gameId}`),
      api.get(`/score-adjustments?game_id=${gameId}`),
    ]).then(([g, p, s, t, pl, os, sa]) => { setGame(g); setPlayers(p); setStats(s); setTeamRole(t.my_role); setTeamType(t.team_type || null); setPlays(pl); setOpponentStats(os); setScoreAdjustments(sa); setScoreForm({ our_score: g.our_score ?? '', opponent_score: g.opponent_score ?? '', game_type: g.game_type || 'regular' }); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gameId, teamId]);

  function openStatModal(player) {
    setSelectedPlayer(player);
    setSelectedStat(null);
    setStatValue('');
    setStatNotes('');
    setSelectedPlay(null);
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
        play_id: selectedPlay || null,
      });
      if (s.our_score !== null && s.our_score !== undefined) {
        setGame(prev => ({ ...prev, our_score: s.our_score }));
      }
      setStatModal(false);
    } catch (err) { setAlertModal(err.message); }
    finally { setSaving(false); }
  }

  function deleteStat(id) {
    setConfirmModal({
      message: 'Remove this stat?',
      onConfirm: async () => {
        const { our_score } = await api.del(`/stats/${id}`);
        setStats(prev => prev.filter(s => s.id !== id));
        if (our_score !== null && our_score !== undefined) {
          setGame(prev => ({ ...prev, our_score }));
        }
      }
    });
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

  // Merged feed — combine stats and opponent stats, sorted by logged_at descending
  const mergedFeed = [
    ...stats.map(s => ({ ...s, _type: 'stat' })),
    ...opponentStats.map(s => ({ ...s, _type: 'opponent' })),
  ].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));

  // Group stats by player
  const statsByPlayer = {};
  stats.forEach(s => {
    const key = s.player_id;
    if (!statsByPlayer[key]) statsByPlayer[key] = { player_name: s.player_name, player_number: s.player_number, stats: [] };
    statsByPlayer[key].stats.push(s);
  });

  const homeAway = game.home_away === 'home' ? 'Home' : game.home_away === 'away' ? 'Away' : 'Neutral';
  const isViewer = teamRole === 'viewer';
  const isAdmin = teamRole === 'admin';
  const gameTypeLabel = { friendly: 'Friendly', playoff: 'Playoff', finals: 'Finals' }[game.game_type];
  const today = new Date(); today.setHours(0,0,0,0);
  const gameDate = new Date(game.game_date); gameDate.setHours(0,0,0,0);
  const isToday = gameDate.getTime() === today.getTime();
  const isPast = gameDate < today;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/teams/${teamId}?tab=games`)}>← All Games</button>
        {(isAdmin || teamRole === 'member') && isToday && (
          <button
            className={`btn btn-sm ${game.game_status === 'active' ? 'btn-danger' : 'btn-primary'}`}
            onClick={async () => {
              const newStatus = game.game_status === 'active' ? 'ended' : game.game_status === 'ended' ? 'active' : 'active';
              const g = await api.patch(`/games/${gameId}/status`, { status: newStatus });
              setGame(g);
            }}
          >
            {game.game_status === 'active' ? 'End Game' : game.game_status === 'ended' ? 'Restart Game' : 'Start Game'}
          </button>
        )}
        {isAdmin && (
          <button className="btn btn-ghost btn-sm" onClick={() => {
            navigator.clipboard.writeText(`https://app.gridiron-stats.co/live/${gameId}`);
            setAlertModal('Live view link copied!');
          }}>Live View</button>
        )}
      </div>

      {/* Game Header */}
      <div className={styles.gameHeader}>
        <div className={styles.gameInfo}>
          <div className={styles.gameTitle}>vs {game.opponent_name}</div>
          <div className={styles.gameMeta}>
            {format(new Date(game.game_date), 'EEEE d MMMM yyyy')}
            {game.game_time && ` · ${game.game_time}`}
            {game.location && ` · ${game.location}`}
            {` · ${homeAway}`}
            {gameTypeLabel && <span className="tag tag-gold" style={{ marginLeft: 8 }}>{gameTypeLabel}</span>}
          </div>
        </div>
        <div className={styles.scoreBox} style={{ cursor: 'default' }}>
          <div className={styles.scoreInner}>
            <div className={styles.scoreNum}>{game.our_score}</div>
            <div className={styles.scoreDash}>–</div>
            <div className={styles.scoreNum}>{game.opponent_score}</div>
          </div>
          <span className={`tag ${game.game_status === 'active' ? 'tag-gold' : isPast || game.game_status === 'ended' ? 'tag-green' : 'tag-gray'}`} style={{ marginTop: 4 }}>
            {game.game_status === 'active' ? '🟢 Live' : game.game_status === 'ended' ? 'Final' : isToday ? `Today${game.game_time ? ' · ' + game.game_time : ''}` : isPast ? 'Final' : 'Scheduled'}
          </span>
        </div>
      </div>   
      {whistleGameId && (
        <>
          <div className={styles.whistleFooterMobile}>
            <WhistleStrip whistleState={whistleState} connected={whistleConnected} onDisconnect={async () => { await api.put(`/games/${gameId}`, { whistle_game_id: null }); setWhistleGameId(null); }} />

          </div>
          <div className={styles.whistleFooterDesktop}>
            <WhistleStrip whistleState={whistleState} connected={whistleConnected} onDisconnect={async () => { await api.put(`/games/${gameId}`, { whistle_game_id: null }); setWhistleGameId(null); }} />
          </div>
        </>
      )}
      {!isViewer && (
        <div style={{ margin: '12px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <div className={styles.actionButtons}>
            <button className={`btn btn-primary ${styles.logStatBtn}`} style={{ flex: 1, minHeight: 64, fontSize: '1rem' }} onClick={openStatFirst}>⚡ Log Stat</button>
            {isAdmin && (
              <button className={`btn btn-secondary ${styles.logStatBtn}`} style={{ flex: 1, minHeight: 64, fontSize: '1rem' }} onClick={() => setOpponentModal(true)}>🏈 Opponent Score</button>
            )}
          </div>
          {isAdmin && (
            <button className={`btn btn-ghost ${styles.logStatBtn} ${styles.adjustBtn}`} style={{ fontSize: '0.85rem', color: 'var(--gray-300)' }} onClick={() => { setAdjustForm({ team: 'ours', adjustment: '', reason: '' }); setAdjustModal(true); }}>⚙️ Adjust Score</button>
          )}
          {isAdmin && (
            <button className={`btn btn-ghost ${styles.logStatBtn} ${styles.whistleBtn}`} onClick={() => { setWhistleInput(whistleGameId || ''); setWhistleModal(true); }}>
              <img src="/whistle-icon.svg" alt="" style={{ width: 18, height: 18, opacity: whistleGameId ? 1 : 0.5 }} />
              {whistleGameId ? 'Whistle' : 'Connect Whistle'}
            </button>
          )}
        </div>
      )}




      <div className={styles.layout}>
        {/* Player roster */}
        <div className={styles.roster}>
          <div className={styles.rosterHeader}>
            <div className="section-label" style={{ marginBottom: 0 }}>{isViewer ? 'Roster' : 'Roster — Tap to Log Stat'}</div>
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
          <div className="section-label">Live Stats ({mergedFeed.length})</div>
          {mergedFeed.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px' }}>
              <p>No stats yet. Tap a player to log a play.</p>
            </div>
          ) : (
            <div className={styles.statList}>
              {mergedFeed.map(item => {
                if (item._type === 'opponent') {
                  const type = OPPONENT_SCORE_TYPES.find(t => t.key === item.stat_type);
                  return (
                    <div key={`opp-${item.id}`} className={styles.statRow} style={{ background: 'rgba(255,0,0,0.06)', borderLeft: '3px solid rgba(255,80,80,0.4)' }}>
                      <span className={styles.statIcon}>{type?.icon || '🏈'}</span>
                      <div className={styles.statContent}>
                        <div className={styles.statMainRow}>
                          <span className={styles.statPlayer} style={{ color: 'var(--gray-300)' }}>Opponent</span>
                          <span className={styles.statLabel}>{type?.label}</span>
                          <span className={styles.statVal}>+{item.value}</span>
                        </div>
                      </div>
                      {isAdmin && <button className={styles.statDel} onClick={() => deleteOpponentStat(item.id)}>✕</button>}
                    </div>
                  );
                }
                const info = getStatInfo(item.stat_type);
                return (
                  <div key={item.id} className={styles.statRow}>
                    <span className={styles.statIcon}>{info.icon}</span>
                    <div className={styles.statContent}>
                      <div className={styles.statMainRow}>
                        <span className={styles.statPlayer}>#{item.player_number} {item.player_name}</span>
                        <span className={styles.statLabel}>{info.label}</span>
                        {info.unit && <span className={styles.statVal}>{item.value} {info.unit}</span>}
                      </div>
                      {item.notes && <div className={styles.statNotes}>{item.notes}</div>}
                    </div>
                    {!isViewer && <button className={styles.statDel} onClick={() => deleteStat(item.id)}>✕</button>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Score adjustment events in feed */}
          {scoreAdjustments.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {scoreAdjustments.map(sa => (
                <div key={sa.id} className={styles.statRow} style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '3px solid rgba(255,255,255,0.15)' }}>
                  <span className={styles.statIcon}>⚙️</span>
                  <div className={styles.statContent}>
                    <div className={styles.statMainRow}>
                      <span className={styles.statPlayer} style={{ color: 'var(--gray-400)' }}>{sa.team === 'ours' ? 'Our' : 'Opponent'} score adjusted</span>
                      <span className={styles.statVal} style={{ color: sa.adjustment >= 0 ? 'var(--gold)' : 'var(--danger)' }}>{sa.adjustment >= 0 ? '+' : ''}{sa.adjustment}</span>
                    </div>
                    <div className={styles.statNotes}>{sa.reason}</div>
                  </div>
                  {isAdmin && <button className={styles.statDel} onClick={async () => {
                    setConfirmModal({
                      message: 'Remove this adjustment?',
                      onConfirm: async () => {
                        const { our_score, opponent_score } = await api.del(`/score-adjustments/${sa.id}`);
                        setScoreAdjustments(prev => prev.filter(a => a.id !== sa.id));
                        if (our_score !== null && our_score !== undefined) setGame(prev => ({ ...prev, our_score }));
                        if (opponent_score !== null && opponent_score !== undefined) setGame(prev => ({ ...prev, opponent_score }));
                      }
                    });
                  }}>✕</button>}
                </div>
              ))}
            </div>
          )}

          {/* Summary by player */}
          {Object.keys(statsByPlayer).length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div className="section-label" style={{ marginBottom: 12 }}>Game Summary</div>
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

      {/* Opponent Score Modal */}
      {opponentModal && (
        <Modal title="Log Opponent Score" onClose={() => setOpponentModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {OPPONENT_SCORE_TYPES.map(type => (
              <button
                key={type.key}
                className="btn btn-secondary"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px' }}
                disabled={opponentSaving}
                onClick={() => logOpponentScore(type.key)}
              >
                <span style={{ fontSize: '1.6rem' }}>{type.icon}</span>
                <span style={{ fontWeight: 700 }}>{type.label}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>+{type.value} pts</span>
              </button>
            ))}
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setOpponentModal(false)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Score Adjustment Modal */}
      {adjustModal && (
        <Modal title="Adjust Score" onClose={() => setAdjustModal(false)}>
          <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 16 }}>
            Use this to correct the score if a stat was missed or logged incorrectly. The adjustment will be recorded with your reason.
          </p>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Adjust</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className={`btn btn-sm ${adjustForm.team === 'ours' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdjustForm(p => ({ ...p, team: 'ours' }))}>Our Score</button>
              <button type="button" className={`btn btn-sm ${adjustForm.team === 'opponent' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setAdjustForm(p => ({ ...p, team: 'opponent' }))}>Opponent Score</button>
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Amount (use negative to subtract e.g. -6)</label>
            <input
              className="form-control"
              type="number"
              value={adjustForm.adjustment}
              onChange={e => setAdjustForm(p => ({ ...p, adjustment: e.target.value }))}
              placeholder="e.g. 6 or -6"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Reason * <span style={{ color: 'var(--gray-500)', fontSize: '0.8rem', fontWeight: 400 }}>required</span></label>
            <input
              className="form-control"
              value={adjustForm.reason}
              onChange={e => setAdjustForm(p => ({ ...p, reason: e.target.value }))}
              placeholder="e.g. Missed TD in Q3"
            />
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setAdjustModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={adjustSaving || !adjustForm.adjustment || !adjustForm.reason.trim()}
              onClick={async () => {
                setAdjustSaving(true);
                try {
                  const { adjustment, our_score, opponent_score } = await api.post('/score-adjustments', {
                    game_id: Number(gameId),
                    team: adjustForm.team,
                    adjustment: Number(adjustForm.adjustment),
                    reason: adjustForm.reason,
                  });
                  if (our_score !== null && our_score !== undefined) setGame(prev => ({ ...prev, our_score }));
                  if (opponent_score !== null && opponent_score !== undefined) setGame(prev => ({ ...prev, opponent_score }));
                  setAdjustModal(false);
                } catch (err) { setAlertModal(err.message); }
                finally { setAdjustSaving(false); }
              }}
            >
              {adjustSaving ? 'Saving...' : 'Apply Adjustment'}
            </button>
          </div>
        </Modal>
      )}

      {/* Whistle Modal */}
      {whistleModal && (
        <Modal title="Connect Whistle" onClose={() => { stopQrScan(); setWhistleModal(false); }}>
          <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 16 }}>
            Paste the Whistle share URL to show the live game clock, down and timeouts alongside your stats.
          </p>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Whistle URL or Game Code</label>
            <input
              className="form-control"
              value={whistleInput}
              onChange={e => setWhistleInput(e.target.value.toLowerCase())}
              placeholder="https://www.whistle-app.co.uk/game/abc123 or abc123"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          {qrSuccess && (
            <div className="alert alert-success" style={{ marginBottom: 14 }}>
              ✓ QR code scanned successfully
            </div>
          )}
          {qrScanning ? (
            <div style={{ marginBottom: 14 }}>
              <video ref={videoRef} style={{ width: '100%', borderRadius: 'var(--radius)', background: '#000' }} playsInline muted />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={stopQrScan}>Cancel scan</button>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={startQrScan}>
              📷 Scan QR Code
            </button>
          )}
          {whistleGameId && (
            <div style={{ marginBottom: 14 }}>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', fontSize: '0.85rem' }} onClick={async () => {
                await api.put(`/games/${gameId}`, { whistle_game_id: null });
                setWhistleGameId(null);
                setWhistleModal(false);
              }}>
                Disconnect Whistle
              </button>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setWhistleModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              disabled={whistleSaving || !whistleInput.trim()}
              onClick={async () => {
                setWhistleSaving(true);
                try {
                  const parsed = parseWhistleId(whistleInput);
                  if (!parsed) { setAlertModal('Could not parse a game ID from that input'); return; }
                  await api.put(`/games/${gameId}`, { whistle_game_id: parsed });
                  setWhistleGameId(parsed);
                  setWhistleModal(false);
                } catch (err) { setAlertModal(err.message); }
                finally { setWhistleSaving(false); }
              }}
            >
              {whistleSaving ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </Modal>
      )}

      {/* Log Stat Modal */}
      {statModal && selectedPlayer && (
        <Modal title={`Log Stat — #${selectedPlayer.number} ${selectedPlayer.name}`} onClose={() => setStatModal(false)} wide>
          <form onSubmit={logStat}>
            <div className={styles.statCategories}>
              {(() => {
                const allowed = getStatsForTeamType(teamType, showMoreStats);
                return Object.entries(STAT_CATEGORIES).map(([catKey, cat]) => {
                  const filteredStats = cat.stats.filter(s => allowed.find(a => a.key === s.key));
                if (!filteredStats.length) return null;
                return (
                <div key={catKey}>
                  <div className={styles.catLabel} style={{ color: cat.color }}>{cat.label}</div>
                  <div className={styles.statGrid}>
                    {filteredStats.map(s => (

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
              );
              });
              })()}
              {teamType === 'flag' && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', fontSize: '0.8rem' }} onClick={() => setShowMoreStats(p => !p)}>
                  {showMoreStats ? 'Show fewer stats' : 'Show more stats'}
                </button>
              )}
            </div>


            {selectedStat && getStatInfo(selectedStat).unit && (
              <div className="form-group" style={{ marginTop: 16 }}>
                <label>Yards / Value</label>
                <input className="form-control" type="number" value={statValue} onChange={e => setStatValue(e.target.value)} placeholder="e.g. 35" autoFocus />
              </div>
            )}
            {selectedStat && plays.length > 0 && (() => {
              const statInfo2 = ALL_STATS.find(s => s.key === selectedStat);
              const playType = statInfo2?.category === 'offense' ? 'offense' : statInfo2?.category === 'defense' ? 'defense' : null;
              const filteredPlays = playType ? plays.filter(p => p.type === playType) : plays;
              if (!filteredPlays.length) return null;
              return (
                <div className="form-group" style={{ marginTop: 12 }}>
                  <label>Play (optional)</label>
                  <select className="form-control" value={selectedPlay || ''} onChange={e => setSelectedPlay(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— No play —</option>
                    {filteredPlays.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              );
            })()}
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
                {(() => {
                  const allowed = getStatsForTeamType(teamType, showMoreStats);
                  return Object.entries(STAT_CATEGORIES).map(([catKey, cat]) => {
                    const countingInCat = cat.stats.filter(s => s.unit === null && !s.excludeFromStatFirst && allowed.find(a => a.key === s.key));
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
                });
              })()}
              </div>
              <div className="modal-footer">
                {teamType === 'flag' && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginRight: 'auto' }} onClick={() => setShowMoreStats(p => !p)}>
                    {showMoreStats ? 'Show fewer stats' : 'Show more stats'}
                  </button>
                )}
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

              {['td_passing', 'two_pt_pass', 'one_pt_pass'].includes(sfStat) ? (
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

              {plays.length > 0 && (() => {
                const statInfo2 = ALL_STATS.find(s => s.key === sfStat);
                const playType = statInfo2?.category === 'offense' ? 'offense' : statInfo2?.category === 'defense' ? 'defense' : null;
                const filteredPlays = playType ? plays.filter(p => p.type === playType) : plays;
                if (!filteredPlays.length) return null;
                return (
                  <div className="form-group" style={{ marginBottom: 14 }}>
                    <label>Play (optional)</label>
                    <select className="form-control" value={sfPlay || ''} onChange={e => setSfPlay(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">— No play —</option>
                      {filteredPlays.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                );
              })()}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Notes (optional)</label>
                <input className="form-control" value={sfNotes} onChange={e => setSfNotes(e.target.value)} placeholder="e.g. Red zone TD, 2nd quarter" />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatFirstModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || (['td_passing', 'two_pt_pass', 'one_pt_pass'].includes(sfStat) ? (!sfPasser && !sfReceiver) : sfStat === 'interception' ? !sfPlayer : !sfPlayer)}
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
    {isAdmin && (
        <div className="section-divider" style={{ paddingBottom: 80, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--gray-400)' }} onClick={refreshGame}>↻ Refresh</button>
          <button className="btn btn-sm btn-secondary" onClick={() => {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 20;

            // Header
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text(`vs ${game.opponent_name}`, 14, y);
            y += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            doc.text(`${format(new Date(game.game_date), 'EEEE d MMMM yyyy')}${game.game_time ? ' · ' + game.game_time : ''}${game.location ? ' · ' + game.location : ''}`, 14, y);
            y += 6;
            doc.text(`Score: ${game.our_score} – ${game.opponent_score}  |  ${game.home_away === 'home' ? 'Home' : game.home_away === 'away' ? 'Away' : 'Neutral'}${gameTypeLabel ? '  |  ' + gameTypeLabel : ''}`, 14, y);
            y += 10;

            // Divider
            doc.setDrawColor(200);
            doc.line(14, y, pageWidth - 14, y);
            y += 8;

            // Game Summary by player
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('Game Summary', 14, y);
            y += 8;

            Object.values(statsByPlayer).forEach(({ player_name, player_number, stats: ps }) => {
              if (y > 270) { doc.addPage(); y = 20; }
              doc.setFontSize(11);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0);
              doc.text(`#${player_number} ${player_name}`, 14, y);
              y += 6;

              const totals = ps.reduce((acc, s) => {
                acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value);
                return acc;
              }, {});

              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(60);
              const statLine = Object.entries(totals).map(([type, total]) => {
                const info = getStatInfo(type);
                return `${info.label}: ${total}${info.unit ? ' ' + info.unit : ''}`;
              }).join('  ·  ');
              const lines = doc.splitTextToSize(statLine, pageWidth - 28);
              doc.text(lines, 20, y);
              y += lines.length * 5 + 4;
            });

            y += 4;
            doc.setDrawColor(200);
            doc.line(14, y, pageWidth - 14, y);
            y += 8;

            // Full stat log
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text('Full Stat Log', 14, y);
            y += 8;

            stats.forEach(s => {
              if (y > 275) { doc.addPage(); y = 20; }
              const info = getStatInfo(s.stat_type);
              doc.setFontSize(10);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(0);
              doc.text(`#${s.player_number} ${s.player_name}`, 14, y);
              doc.setFont('helvetica', 'bold');
              doc.text(`${info.label}${info.unit ? ': ' + s.value + ' ' + info.unit : ''}`, 70, y);
              const meta = [s.play_name, s.notes].filter(Boolean).join(' · ');
              if (meta) {
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100);
                doc.text(meta, 130, y);
              }
              y += 6;
            });

	    

            // Opponent scoring log
            if (opponentStats.length > 0) {
              if (y > 260) { doc.addPage(); y = 20; }
              y += 4;
              doc.setDrawColor(200);
              doc.line(14, y, pageWidth - 14, y);
              y += 8;

              doc.setFontSize(13);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0);
              doc.text('Opponent Scoring', 14, y);
              y += 8;

              const OPPONENT_LABELS = { touchdown: 'Touchdown', one_xp: '1XP', two_xp: '2XP', safety: 'Safety', field_goal: 'Field Goal' };
              opponentStats.slice().reverse().forEach(os => {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60);
                doc.text(OPPONENT_LABELS[os.stat_type] || os.stat_type, 14, y);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0);
                doc.text(`+${os.value} pts`, 70, y);
                y += 6;
              });

              doc.setFontSize(10);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0);
              const oppTotal = opponentStats.reduce((acc, os) => acc + os.value, 0);
              doc.text(`Total: ${oppTotal} pts`, 14, y);
              y += 8;
            }

            // Score adjustments log
            if (scoreAdjustments.length > 0) {
              if (y > 260) { doc.addPage(); y = 20; }
              y += 4;
              doc.setDrawColor(200);
              doc.line(14, y, pageWidth - 14, y);
              y += 8;

              doc.setFontSize(13);
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(0);
              doc.text('Score Adjustments', 14, y);
              y += 8;

              scoreAdjustments.forEach(sa => {
                if (y > 275) { doc.addPage(); y = 20; }
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(60);
                doc.text(`${sa.team === 'ours' ? 'Our score' : 'Opponent score'}`, 14, y);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0);
                doc.text(`${sa.adjustment >= 0 ? '+' : ''}${sa.adjustment} pts`, 70, y);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(100);
                const reasonLines = doc.splitTextToSize(sa.reason, pageWidth - 130);
                doc.text(reasonLines, 100, y);
                y += Math.max(6, reasonLines.length * 5);
              });
            }

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Generated by Gridiron Stats · gridiron-stats.co', 14, doc.internal.pageSize.getHeight() - 10);

            doc.save(`${game.opponent_name} — ${format(new Date(game.game_date), 'd MMM yyyy')}.pdf`);
          }}>
            ⬇ Export PDF
          </button>
          <button className="btn btn-sm btn-danger" onClick={async () => {
            setConfirmModal({
              message: 'Delete this game and all its stats? This cannot be undone.',
              confirmLabel: 'Delete Game',
              onConfirm: async () => {
                await api.del(`/games/${gameId}`);
                navigate(`/teams/${teamId}`);
              }
            });
          }}>Delete Game</button>
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
      activeKey="games"
      items={[
        { key: 'games', label: 'Games', onClick: () => navigate(`/teams/${teamId}?tab=games`), icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
        ...(!isViewer ? [{ key: 'log', label: 'Log Stat', onClick: openStatFirst, icon: <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></> }] : []),
        ...(isAdmin ? [{ key: 'score', label: 'Score', onClick: () => { setAdjustForm({ team: 'ours', adjustment: '', reason: '' }); setAdjustModal(true); }, icon: <><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></> }] : []),
      ]}
    />
    <div className="bottom-nav-padding" />
    </div>
  );
}