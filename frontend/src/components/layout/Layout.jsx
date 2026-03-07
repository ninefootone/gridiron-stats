import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import styles from './Layout.module.css';

export default function Layout() {
  const { user, logout } = useAuth0();
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
          {user?.picture && <img src={user.picture} alt={user.name} className={styles.avatar} />}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.name || user?.email}</div>
            <button
              className={styles.logoutBtn}
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className={`${styles.main} yard-lines`}>
        <Outlet />
      </main>
    </div>
  );
}
