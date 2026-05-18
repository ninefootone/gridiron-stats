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
        <div style={{ marginBottom: 16 }}>
          <a href="https://gridiron-stats.co.uk/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/football.svg" alt="" style={{ width: 24, height: 24 }} />
            <span style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f5a623', lineHeight: 1 }}>Gridiron Stats</span>
          </a>
        </div>
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
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
          Season Totals
        </div>
        {visibleTotals.length === 0 && compPct === null ? (
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9rem' }}>No stats recorded yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {compPct !== null && (
              <>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.7rem', fontWeight: 900, color: '#f5a623', lineHeight: 1, marginBottom: 4 }}>
                    {completions}/{attempts}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Completions
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.7rem', fontWeight: 900, color: '#f5a623', lineHeight: 1, marginBottom: 4 }}>
                    {compPct}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Comp%
                  </div>
                </div>
              </>
            )}
            {visibleTotals.map(([type, total]) => {
              const info = getStatInfo(type);
              return (
                <div key={type} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1.7rem', fontWeight: 900, color: '#f5a623', lineHeight: 1, marginBottom: 4 }}>
                    {total}{info.unit ? <span style={{ fontSize: '0.85rem', marginLeft: 2 }}>{info.unit}</span> : ''}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {info.label}
                  </div>
                </div>
              );
            })}
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
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    {gameCompPct !== null && (
                      <>
                        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 64 }}>
                          <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1rem', fontWeight: 900, color: '#f5a623', lineHeight: 1, marginBottom: 2 }}>{gameCompletions}/{gameAttempts}</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Completions</div>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 64 }}>
                          <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1rem', fontWeight: 900, color: '#f5a623', lineHeight: 1, marginBottom: 2 }}>{gameCompPct}%</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Comp%</div>
                        </div>
                      </>
                    )}
                    {visibleGame.map(([type, total]) => {
                      const info = getStatInfo(type);
                      return (
                        <div key={type} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 64 }}>
                          <div style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: '1rem', fontWeight: 900, color: '#f5a623', lineHeight: 1, marginBottom: 2 }}>{total}{info.unit ? <span style={{ fontSize: '0.75rem', marginLeft: 1 }}>{info.unit}</span> : ''}</div>
                          <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{info.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: '0.75rem' }}>
        <a href="https://gridiron-stats.co.uk/" target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.2)', textDecoration: 'none' }}>
          Powered by Gridiron Stats · gridiron-stats.co.uk
        </a>
      </div>
    </div>
  );
}