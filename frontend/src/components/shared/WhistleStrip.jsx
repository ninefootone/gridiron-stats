import styles from './WhistleStrip.module.css';

export default function WhistleStrip({ whistleState, connected }) {
  if (!whistleState || !whistleState.gameStarted || whistleState.gameEnded) {
    return (
      <div className={styles.waiting}>
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

  const timeoutsPerHalf = whistleState.timeoutsPerHalf || 3;
  const timeoutsLeft1 = timeoutsPerHalf - (whistleState.timeoutsUsed?.['1'] || 0);
  const timeoutsLeft2 = timeoutsPerHalf - (whistleState.timeoutsUsed?.['2'] || 0);

  return (
    <div className={styles.strip}>
      <span className={`${styles.clock} ${whistleState.gameClockRunning ? styles.clockRunning : styles.clockStopped}`}>
        {formatTime(whistleState.gameTimeLeft)}
      </span>
      <span className={styles.period}>{getPeriod(whistleState.currentHalf)}</span>
      {whistleState.currentDown && (
        <span className={styles.down}>{getDown(whistleState.currentDown)} down</span>
      )}
      <span className={styles.playClock}>
        Play: <strong className={styles.playClockVal}>{whistleState.playTimeLeft ?? '--'}</strong>
      </span>
      <div className={styles.timeouts}>
        {Array.from({ length: timeoutsPerHalf }).map((_, i) => (
          <span key={`t1-${i}`} className={`${styles.dot} ${i < timeoutsLeft1 ? styles.dotActive : styles.dotUsed}`} />
        ))}
        <span className={styles.separator}>·</span>
        {Array.from({ length: timeoutsPerHalf }).map((_, i) => (
          <span key={`t2-${i}`} className={`${styles.dot} ${i < timeoutsLeft2 ? styles.dotActive : styles.dotUsed}`} />
        ))}
      </div>
    </div>
  );
}