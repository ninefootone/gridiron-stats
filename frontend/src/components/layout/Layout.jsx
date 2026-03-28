import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import { useHelp } from '../../context/HelpContext';
import { useUpgrade } from '../../context/UpgradeContext';
import { useApi } from '../../hooks/useApi';
import styles from './Layout.module.css';

export default function Layout() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const { openHelp } = useHelp();
  const api = useApi();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [plan, setPlan] = useState(null);
  const [subInfo, setSubInfo] = useState(null);
  const { openUpgrade } = useUpgrade();

  useEffect(() => {
    api.get('/billing/subscription').then(sub => {
      setPlan(sub.plan);
      setSubInfo(sub);
    }).catch(() => {});
  }, []);

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
            <img src="/football.svg" alt="" className={styles.logoIcon} />
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
              {plan && (
                <div style={{ marginTop: 4 }}>
                  <span className={`tag ${plan === 'club' ? 'tag-gold' : plan === 'individual' ? 'tag-green' : 'tag-gray'}`} style={{ fontSize: '0.7rem' }}>
                    {plan === 'club' ? 'Club' : plan === 'individual' ? 'Individual' : 'Free'} plan
                  </span>
                  {subInfo?.cancel_at_period_end && subInfo?.current_period_end && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--gray-400)', marginTop: 4 }}>
                      Cancels {new Date(subInfo.current_period_end).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              )}
              </div>
              <div className={styles.dropdownDivider} />
              <button
                className={styles.dropdownItem}
                onClick={async () => {
                  setMenuOpen(false);
                  try {
                    const sub = await api.get('/billing/subscription');
                    if (sub.stripe_customer_id && sub.status === 'active') {
                      const { url } = await api.post('/billing/portal', {});
                      window.location.href = url;
                    } else {
                      openUpgrade('teams');
                    }
                  } catch {
                    openUpgrade('teams');
                  }
                }}
              >
                {plan === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
              </button>
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