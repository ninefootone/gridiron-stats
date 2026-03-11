import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/clerk-react';
import styles from './Layout.module.css';

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();

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

        <div className={styles.userArea}>
          {user?.imageUrl && <img src={user.imageUrl} alt={user.fullName} className={styles.avatar} />}
          <div className={styles.userInfo}>
            <div className={styles.userName}>{user?.fullName || user?.primaryEmailAddress?.emailAddress}</div>
            <button className={styles.logoutBtn} onClick={() => signOut(() => navigate('/login'))}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className={`${styles.main} yard-lines`}>
        <Outlet />
      </main>
    </div>
  );
}