import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getStatInfo } from '../utils/stats';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function PublicPlayerPage() {
  const { token } = useParams();
  const [player, setPlayer] = useState(null);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/public/players/${token}`).then(r => r.json()),
      fetch(`${API_URL}/api/public/players/${token}/stats`).then(r => r.json()),
    ]).then(([p, s]) => {
      if (p.error) { setError('Player not found'); return; }
      setPlayer(p);
      setStats(s);
    }).catch(() => setError('Failed to load player'))
      .finally(() => setLoading(false));
  }, [token]);

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

  // Season totals
  const totals = stats.reduce((acc, s) => {
    acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value);
    return acc;
  }, {});

  const completions = totals['completion'] || 0;
  const incompletes = totals['incomplete'] || 0;
  const attempts = completions + incompletes;
  const compPct = attempts > 0 ? Math.round((completions / attempts) * 100) : null;

  const visibleTotals = Object.entries(totals).filter(([type]) => !getStatInfo(type).hidden);

  // Group by game
  const byGame = {};
  stats.forEach(s => {
    if (!byGame[s.game_id]) byGame[s.game_id] = {
      opponent_name: s.opponent_name,
      game_date: s.game_date,
      our_score: s.our_score,
      opponent_score: s.opponent_score,
      stats: [],
    };
    byGame[s.game_id].stats.push(s);
  });

  const games = Object.values(byGame).sort((a, b) => new Date(b.game_date) - new Date(a.game_date));

  return (
    <div style={{ minHeight: '100vh', background: '#1a3a2a', color: 'white', fontFamily: 'var(--font-body, sans-serif)', padding: '24px 16px', maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          Gridiron Stats · {player.team_name}
        </div>
        <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '2.2rem', fontWeight: 900, textTransform: 'uppercase', lineHeight: 1 }}>
          {player.number != null ? `#${player.number} ` : ''}{player.name}
        </div>
        {player.positions?.length > 0 && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginTop: 6 }}>
            {player.positions.join(' · ')}
          </div>
        )}
      </div>

      {/* Season Totals */}
      <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '20px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 14 }}>
          Season Totals
        </div>
        {visibleTotals.length === 0 && compPct === null ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No stats recorded yet.</div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 24px' }}>
            {visibleTotals.map(([type, total]) => {
              const info = getStatInfo(type);
              return (
                <div key={type}>
                  <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.6rem', fontWeight: 900, color: '#f5a623', lineHeight: 1 }}>
                    {total}{info.unit ? <span style={{ fontSize: '0.9rem', marginLeft: 2 }}>{info.unit}</span> : ''}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    {info.label}
                  </div>
                </div>
              );
            })}
            {compPct !== null && (
              <div>
                <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.6rem', fontWeight: 900, color: '#f5a623', lineHeight: 1 }}>
                  {compPct}<span style={{ fontSize: '0.9rem', marginLeft: 1 }}>%</span>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                  Comp%
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Game Log */}
      {games.length > 0 && (
        <>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
            Game Log
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {games.map(({ opponent_name, game_date, our_score, opponent_score, stats: gs }) => {
              const gameTotals = gs.reduce((acc, s) => {
                acc[s.stat_type] = (acc[s.stat_type] || 0) + Number(s.value);
                return acc;
              }, {});
              const gameCompletions = gameTotals['completion'] || 0;
              const gameIncompletes = gameTotals['incomplete'] || 0;
              const gameAttempts = gameCompletions + gameIncompletes;
              const gameCompPct = gameAttempts > 0 ? Math.round((gameCompletions / gameAttempts) * 100) : null;
              const visibleGame = Object.entries(gameTotals).filter(([type]) => !getStatInfo(type).hidden);

              return (
                <div key={`${opponent_name}-${game_date}`} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>vs {opponent_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                      {format(new Date(game_date), 'd MMM yyyy')}
                      {our_score != null && ` · ${our_score}–${opponent_score}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px' }}>
                    {visibleGame.map(([type, total]) => {
                      const info = getStatInfo(type);
                      return (
                        <div key={type} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                          <span style={{ color: '#f5a623', fontWeight: 700 }}>{total}{info.unit ? ` ${info.unit}` : ''}</span>
                          {' '}{info.label}
                        </div>
                      );
                    })}
                    {gameCompPct !== null && (
                      <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                        <span style={{ color: '#f5a623', fontWeight: 700 }}>{gameCompPct}%</span> Comp%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
        Powered by Gridiron Stats · gridiron-stats.co
      </div>
    </div>
  );
}