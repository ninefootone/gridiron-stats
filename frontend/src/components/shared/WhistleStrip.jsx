export default function WhistleStrip({ whistleState, connected }) {
  if (!whistleState || !whistleState.gameStarted || whistleState.gameEnded) {
    return (
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '6px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {connected ? 'Whistle connected — waiting for game to start' : 'Whistle connecting...'}
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
      background: 'rgba(0,0,0,0.2)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 'var(--radius)',
      padding: '8px 14px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      flexWrap: 'wrap',
      fontSize: '0.8rem',
      marginTop: 8,
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
      <span style={{ color: 'var(--gray-400)', fontSize: '0.75rem', marginLeft: 'auto' }}>
        TOs: {'●'.repeat(timeoutsLeft1)}{'○'.repeat(Math.max(0, (whistleState.timeoutsPerHalf || 3) - timeoutsLeft1))}
        {' · '}
        {'●'.repeat(timeoutsLeft2)}{'○'.repeat(Math.max(0, (whistleState.timeoutsPerHalf || 3) - timeoutsLeft2))}
      </span>
    </div>
  );
}