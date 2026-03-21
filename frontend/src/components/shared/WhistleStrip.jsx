import { useState } from 'react';
import styles from './WhistleStrip.module.css';
import Modal from './Modal';

export default function WhistleStrip({ whistleState, connected, onDisconnect }) {
  const [modalOpen, setModalOpen] = useState(false);

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
  const team1 = whistleState.team1Name || 'Home';
  const team2 = whistleState.team2Name || 'Away';

  const TimeoutDots = ({ left, total }) => (
    <div className={styles.dotRow}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={`${styles.dot} ${i < left ? styles.dotActive : styles.dotUsed}`} />
      ))}
    </div>
  );

  return (
    <>
      <button className={styles.strip} onClick={() => setModalOpen(true)}>
        <span className={styles.period}>{getPeriod(whistleState.currentHalf)}</span>
        <span className={`${styles.clock} ${whistleState.gameClockRunning ? styles.clockRunning : styles.clockStopped}`}>
          {formatTime(whistleState.gameTimeLeft)}
        </span>
        {whistleState.currentDown && (
          <span className={styles.down}>{getDown(whistleState.currentDown)} down</span>
        )}
        <span className={styles.tapHint}>tap for more</span>
      </button>

      {modalOpen && (
        <Modal title="Whistle" onClose={() => setModalOpen(false)}>
          <div className={styles.modalContent}>

            {/* Big clock */}
            <div className={styles.modalClock}>
              <div className={`${styles.modalClockTime} ${whistleState.gameClockRunning ? styles.clockRunning : styles.clockStopped}`}>
                {formatTime(whistleState.gameTimeLeft)}
              </div>
              <div className={styles.modalClockMeta}>
                {getPeriod(whistleState.currentHalf)}
                {whistleState.currentDown && ` · ${getDown(whistleState.currentDown)} down`}
              </div>
            </div>

            {/* Play clock */}
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>Play clock</span>
              <span className={styles.modalVal}>{whistleState.playTimeLeft ?? '--'}s</span>
            </div>

            {/* Divider */}
            <div className={styles.modalDivider} />

            {/* Team 1 timeouts */}
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>{team1}</span>
              <TimeoutDots left={timeoutsLeft1} total={timeoutsPerHalf} />
              <span className={styles.modalVal}>{timeoutsLeft1} TOs</span>
            </div>

            {/* Team 2 timeouts */}
            <div className={styles.modalRow}>
              <span className={styles.modalLabel}>{team2}</span>
              <TimeoutDots left={timeoutsLeft2} total={timeoutsPerHalf} />
              <span className={styles.modalVal}>{timeoutsLeft2} TOs</span>
            </div>

            {/* Divider */}
            <div className={styles.modalDivider} />

            {/* Whistle score */}
            <div className={styles.modalScore}>
              <div className={styles.modalScoreTeam}>
                <div className={styles.modalScoreName}>{team1}</div>
                <div className={styles.modalScoreNum}>{whistleState.scores?.team1 ?? 0}</div>
              </div>
              <div className={styles.modalScoreDash}>–</div>
              <div className={styles.modalScoreTeam}>
                <div className={styles.modalScoreName}>{team2}</div>
                <div className={styles.modalScoreNum}>{whistleState.scores?.team2 ?? 0}</div>
              </div>
            </div>
            <div className={styles.modalScoreNote}>Score as logged in Whistle — cross-reference with Gridiron Stats score above</div>

          </div>
          <div className="modal-footer">
            {onDisconnect && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', marginRight: 'auto' }} onClick={() => { setModalOpen(false); onDisconnect(); }}>
                Disconnect Whistle
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setModalOpen(false)}>Close</button>
          </div>

        </Modal>
      )}
    </>
  );
}
