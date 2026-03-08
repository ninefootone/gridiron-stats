import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import styles from './Layout.module.css';

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar}>
        <div className={styles.logo} onClick={() => navigate('/teams')}>
          <span className={styles.logoIcon}>🏈</span>
          <div>
            <div className={styles.logoTitle}>Gridiron</div>
            <div className={styles.logoSub}>Stats Tracker</div>
          </div>
        </div>

        <div className={styles.navLinks}>
          <NavLink to="/teams" className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}>
            <span>🏟️</span> My Teams
          </NavLink>
        </div>

        <div className={styles.userArea}>
          {user?.imageUrl && <img src={user.imageUrl} alt={user.fullName} className={styles.avatar} />}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.fullName || user?.primaryEmailAddress?.emailAddress}</div>
            <button className={styles.logoutBtn} onClick={() => signOut(() => navigate('/login'))}>
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLogo} onClick={() => navigate('/teams')}>🏈 Gridiron Stats</div>
        <button className={styles.mobileSignOut} onClick={() => signOut(() => navigate('/login'))}>
          Sign out
        </button>
      </div>

      <main className={`${styles.main} yard-lines`}>
        <Outlet />
      </main>
    </div>
  );
}