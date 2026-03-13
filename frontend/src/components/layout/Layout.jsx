import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useHelp } from '../../context/HelpContext';
import styles from './Layout.module.css';

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { openHelp } = useHelp();
  const [menuOpen, setMenuOpen] = useState(false);
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
                onClick={() => { setMenuOpen(false); openHelp(); }}
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
    </div>
  );
}