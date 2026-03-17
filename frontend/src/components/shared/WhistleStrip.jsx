export default function WhistleStrip({ whistleState, connected }) {
  if (!whistleState || !whistleState.gameStarted || whistleState.gameEnded) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {!connected ? 'Whistle connecting...' : whistleState?.gameEnded ? 'Whistle connected — game has ended' : 'Whistle connected — waiting for game to start'}
      </div>
    );
  }

  const formatTime = (s) => {
    if (s === undefined || s === null) return '--:--';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const getPeriod = (half) => {
    if (half === 1) return '1st Half';
    if (half === 2) return '2nd Half';
    if (half >= 3) return `OT ${half - 2}`;
    return '';
  };

  const getDown = (d) => {
    const suffix = ['st', 'nd', 'rd', 'th'];
    return `${d}${suffix[(d - 1)] || 'th'}`;
  };

  const timeoutsLeft1 = (whistleState.timeoutsPerHalf || 3) - (whistleState.timeoutsUsed?.['1'] || 0);
  const timeoutsLeft2 = (whistleState.timeoutsPerHalf || 3) - (whistleState.timeoutsUsed?.['2'] || 0);

  return (
    <div style={{
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      fontSize: '0.8rem',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: whistleState.gameClockRunning ? 'var(--gold)' : 'var(--white)' }}>
        {formatTime(whistleState.gameTimeLeft)}
      </span>
      <span style={{ color: 'var(--gray-300)' }}>{getPeriod(whistleState.currentHalf)}</span>
      {whistleState.currentDown && (
        <span style={{ color: 'var(--gray-300)' }}>{getDown(whistleState.currentDown)} down</span>
      )}
      <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem' }}>
        Play: <strong style={{ color: 'var(--white)' }}>{whistleState.playTimeLeft ?? '--'}</strong>
      </span>
      <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
        {Array.from({ length: whistleState.timeoutsPerHalf || 3 }).map((_, i) => (
          <span key={`t1-${i}`} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: i < timeoutsLeft1 ? 'var(--gold)' : 'rgba(255,255,255,0.15)' }} />
        ))}
        <span style={{ margin: '0 4px', color: 'rgba(255,255,255,0.2)' }}>·</span>
        {Array.from({ length: whistleState.timeoutsPerHalf || 3 }).map((_, i) => (
          <span key={`t2-${i}`} style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: i < timeoutsLeft2 ? 'var(--gold)' : 'rgba(255,255,255,0.15)' }} />
        ))}
      </span>
    </div>
  );
}