import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getStatNarrative, getStatInfo } from '../utils/stats';
import { useGameSocket } from '../hooks/useGameSocket';
import { useWhistleSocket } from '../hooks/useWhistleSocket';
import WhistleStrip from '../components/shared/WhistleStrip';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function LivePage() {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [stats, setStats] = useState([]);
  const [opponentStats, setOpponentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/public/games/${gameId}`).then(r => r.json()),
      fetch(`${API_URL}/api/public/stats?game_id=${gameId}`).then(r => r.json()),
      fetch(`${API_URL}/api/public/opponent-stats?game_id=${gameId}`).then(r => r.json()),
    ]).then(([g, s, os]) => {
      if (g.error) { setError('Game not found'); return; }
      setGame(g);
      setStats(s);
      setOpponentStats(os);
    }).catch(() => setError('Failed to load game'))
      .finally(() => setLoading(false));
  }, [gameId]);

  useGameSocket(gameId, {
    stat_added: ({ stat }) => {
      setStats(prev => prev.find(s => s.id === stat.id) ? prev : [stat, ...prev]);
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
      setOpponentStats(prev => prev.find(s => s.id === stat.id) ? prev : [stat, ...prev]);
      setGame(prev => ({ ...prev, opponent_score }));
    },
    opponent_score_deleted: ({ stat_id, opponent_score }) => {
      setOpponentStats(prev => prev.filter(s => s.id !== stat_id));
      setGame(prev => ({ ...prev, opponent_score }));
    },
    adjustment_added: ({ our_score, opponent_score }) => {
      if (our_score !== null && our_score !== undefined) setGame(prev => ({ ...prev, our_score }));
      if (opponent_score !== null && opponent_score !== undefined) setGame(prev => ({ ...prev, opponent_score }));
    },
    adjustment_deleted: ({ our_score, opponent_score }) => {
      if (our_score !== null && our_score !== undefined) setGame(prev => ({ ...prev, our_score }));
      if (opponent_score !== null && opponent_score !== undefined) setGame(prev => ({ ...prev, opponent_score }));
    },
    game_status_changed: ({ game_status }) => {
      setGame(prev => ({ ...prev, game_status }));
    },
  });

  const { whistleState, connected: whistleConnected } = useWhistleSocket(game?.whistle_game_id || null);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: '#1a3a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      <p>{error}</p>
    </div>
  );

  const today = new Date(); today.setHours(0,0,0,0);
  const gameDate = new Date(game.game_date); gameDate.setHours(0,0,0,0);
  const isToday = gameDate.getTime() === today.getTime();
  const isPast = gameDate < today;

  if (!isToday && !isPast && game.game_status === 'scheduled') {
    return (
      <div style={{ minHeight: '100vh', background: '#1a3a2a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif', padding: 24 }}>
        <div style={{ marginBottom: 16 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', marginBottom: 8 }}>No Live Game Today</div>
        <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
          Next game: vs {game.opponent_name} on {format(new Date(game.game_date), 'EEEE d MMMM yyyy')}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: 24 }}>Powered by Gridiron Stats</p>
      </div>
    );
  }

  const OPPONENT_LABELS = { touchdown: 'Touchdown', one_xp: '1XP', two_xp: '2XP', safety: 'Safety', field_goal: 'Field Goal' };

  // Build merged feed sorted by logged_at
  const narrativeFeed = stats
    .map(s => ({ ...s, narrative: getStatNarrative(s, stats) }))
    .filter(s => s.narrative !== null);

  const mergedLiveFeed = [
    ...narrativeFeed.map(s => ({ ...s, _type: 'stat' })),
    ...opponentStats.map(s => ({ ...s, _type: 'opponent' })),
  ].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));

  return (
    <div style={{ minHeight: '100vh', background: '#1a3a2a', color: 'white', fontFamily: 'var(--font-body, sans-serif)', padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{marginRight:6,verticalAlign:'middle',color:'#d94f4f'}}><circle cx="12" cy="12" r="12"/></svg>Live · Gridiron Stats
        </div>
        <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase' }}>
          vs {game.opponent_name}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 4 }}>
          {format(new Date(game.game_date), 'EEEE d MMMM yyyy')}
          {game.game_time && ` · ${game.game_time}`}
          {game.location && ` · ${game.location}`}
        </div>
      </div>

      {/* Score */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 24px', textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '4rem', fontWeight: 900, color: '#f5a623', lineHeight: 1 }}>{game.our_score}</div>
          <div style={{ fontSize: '2.5rem', color: 'rgba(255,255,255,0.3)' }}>–</div>
          <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '4rem', fontWeight: 900, color: '#f5a623', lineHeight: 1 }}>{game.opponent_score}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {game.game_status === 'ended' || isPast ? 'Final Score' : game.game_status === 'active' ? '🟢 Live' : `Today${game.game_time ? ' · ' + game.game_time : ''}`}
          </span>
          {game.game_status === 'active' && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(100,220,100,0.15)', color: '#6edb8a', padding: '1px 8px', borderRadius: 99, border: '1px solid rgba(100,220,100,0.3)' }}>In Progress</span>
          )}
          {game.game_status === 'ended' && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '1px 8px', borderRadius: 99 }}>Full Time</span>
          )}
        </div>
      </div>

      {game?.whistle_game_id && (
        <div style={{ marginBottom: 16 }}>
          <WhistleStrip whistleState={whistleState} connected={whistleConnected} />
        </div>
      )}

      {/* Stat feed */}
      <div style={{ marginBottom: 8, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.4)' }}>
        Play by Play
      </div>

      {mergedLiveFeed.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.3)' }}>
          No plays logged yet
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {mergedLiveFeed.map(item => {
            if (item._type === 'opponent') {
              return (
                <div key={`opp-${item.id}`} style={{ background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: '0.9rem', color: 'rgba(255,200,200,0.9)' }}>
                  🏈 Opponent — {OPPONENT_LABELS[item.stat_type] || item.stat_type} (+{item.value} pts)
                </div>
              );
            }
            return (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '10px 14px', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {item.narrative}
                {item.notes && <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{item.notes}</div>}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
        Powered by Gridiron Stats · gridiron-stats.co
      </div>
    </div>
  );
}