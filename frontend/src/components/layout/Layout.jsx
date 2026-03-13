import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import styles from './Layout.module.css';
import Modal from '../shared/Modal';

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpModal, setHelpModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || '?';

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logoArea}>
          <div className={styles.logo} onClick={() => navigate('/teams')}>
            <span className={styles.logoIcon}>🏈</span>
            <div>
              <div className={styles.logoTitle}>Gridiron Stats</div>
            </div>
          </div>
          <NavLink to="/teams" className={styles.allTeamsBtn}>
            All Teams
          </NavLink>
        </div>

        <div className={styles.userArea} ref={menuRef}>
          <button className={styles.avatarBtn} onClick={() => setMenuOpen(p => !p)}>
            {user?.imageUrl
              ? <img src={user.imageUrl} alt={user.fullName} className={styles.avatar} />
              : <div className={styles.avatarFallback}>{initials}</div>
            }
          </button>

          {menuOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUser}>
                <div className={styles.dropdownName}>{user?.fullName || 'Account'}</div>
                <div className={styles.dropdownEmail}>{user?.primaryEmailAddress?.emailAddress}</div>
              </div>
              <div className={styles.dropdownDivider} />
              <button
                className={styles.dropdownItem}
                onClick={() => { setMenuOpen(false); setHelpModal(true); }}
              >
                Help & Info
              </button>
              <button
                className={styles.dropdownItem}
                onClick={() => { setMenuOpen(false); signOut(() => navigate('/login')); }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={`${styles.main} yard-lines`}>
        <Outlet />
      </main>

      {helpModal && (
        <Modal title="Help & Info" onClose={() => setHelpModal(false)} wide>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--gray-100)' }}>

            <p style={{ color: 'var(--gray-300)', marginBottom: 20 }}>Gridiron Stats helps you track player performance across your American Football season. Here's a quick overview of what you can do.</p>

            {[
              { title: 'Teams', body: "Create a team to get started. You'll be the admin and get two share codes — a Join Code for coaches and players who need to log stats, and a View Code for anyone who just wants to follow along. Share these via the 🔗 Share Codes button on the My Teams page." },
              { title: 'Players', body: 'Add your roster manually or import via CSV. You can set jersey numbers, positions, and mark players as active or inactive. Inactive players are hidden from the stat logging screen.' },
              { title: 'Games', body: 'Schedule your games in advance, then tap through to a game to log stats live. You can update the score at any time and mark the game type — regular, friendly, playoff, or finals. Friendly games don\'t count toward the season leaderboard.' },
              { title: 'Logging Stats', body: 'On the game screen, tap ⚡ Log Stat to quickly log a play. Choose the stat type first, then select the player. Or tap a player directly from the roster to log a stat for them. You can optionally attach a play and add notes to each stat.' },
              { title: 'Plays', body: 'Admins can define a playbook under the Plays tab. Plays are split into offense and defense, and when logging stats the relevant plays are automatically filtered. Plays are tied to a season so you can build a new playbook each year.' },
              { title: 'Leaderboard', body: 'The Leaderboard tab shows season totals for every player across all non-friendly games. Use the CSV export to download a full stats spreadsheet.' },
              { title: 'Exporting', body: 'Admins can export a game stat sheet as a PDF from the bottom of any game page, and a full player report PDF from each player\'s profile page.' },
            ].map(({ title, body }) => (
              <div key={title} style={{ marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4 }}>{title}</div>
                <p style={{ color: 'var(--gray-300)', margin: 0 }}>{body}</p>
              </div>
            ))}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>Roles</div>
              {[
                { role: 'Admin', desc: 'Full access including managing players, logging stats, and exporting' },
                { role: 'Member', desc: 'Can log stats but can\'t manage the roster or settings' },
                { role: 'Viewer', desc: 'Read-only access, great for parents and supporters' },
              ].map(({ role, desc }) => (
                <div key={role} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <span className="tag tag-gold" style={{ flexShrink: 0 }}>{role}</span>
                  <span style={{ color: 'var(--gray-300)', fontSize: '0.88rem', alignSelf: 'center' }}>{desc}</span>
                </div>
              ))}
            </div>

          </div>
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={() => setHelpModal(false)}>Got it</button>
          </div>
        </Modal>
      )}

    </div>
  );
}