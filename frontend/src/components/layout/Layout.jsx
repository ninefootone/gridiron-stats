import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useUser, useClerk } from '@clerk/react';
import { useHelp } from '../../context/HelpContext';
import { useUpgrade } from '../../context/UpgradeContext';
import { useApi } from '../../hooks/useApi';
import styles from './Layout.module.css';
import Modal from '../shared/Modal';

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
  const [deleteAccountModal, setDeleteAccountModal] = useState(false);
  const [deleteAccountStep, setDeleteAccountStep] = useState(1);
  const [soleAdminTeams, setSoleAdminTeams] = useState([]);
  const [deleteAccountSaving, setDeleteAccountSaving] = useState(false);

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
              <button
                className={styles.dropdownItem}
                style={{ color: 'var(--danger, #d94f4f)' }}
                onClick={async () => {
                  setMenuOpen(false);
                  const teams = await api.get('/users/me/sole-admin-teams');
                  setSoleAdminTeams(teams);
                  setDeleteAccountStep(1);
                  setDeleteAccountModal(true);
                }}
              >
                Delete Account
              </button>
            </div>
          )}
        </div>
      </header>
      <main className={`${styles.main} yard-lines`}>
        <Outlet />
      </main>
      {deleteAccountModal && (
        <Modal title="Delete Account" onClose={() => setDeleteAccountModal(false)}>
          {deleteAccountStep === 1 && (
            <>
              <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 16 }}>
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              {soleAdminTeams.length > 0 && (
                <div style={{ background: 'rgba(217,79,79,0.1)', border: '1px solid rgba(217,79,79,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: '0.88rem', color: '#ff8080', marginBottom: 8, fontWeight: 700 }}>
                    ⚠️ You are the sole admin of {soleAdminTeams.length} team{soleAdminTeams.length === 1 ? '' : 's'}:
                  </p>
                  {soleAdminTeams.map(t => (
                    <div key={t.id} style={{ fontSize: '0.85rem', color: 'var(--gray-300)', marginBottom: 4 }}>
                      • {t.name} — {t.player_count} players, {t.game_count} games
                    </div>
                  ))}
                  <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)', marginTop: 8 }}>
                    If you delete your account, these teams will be deleted too. To keep them, promote another coach to admin first.
                  </p>
                </div>
              )}
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDeleteAccountModal(false)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => setDeleteAccountStep(2)}>Continue</button>
              </div>
            </>
          )}
          {deleteAccountStep === 2 && (
            <>
              <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 20 }}>
                What would you like to do with your data?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                <button
                  className="btn btn-danger"
                  style={{ whiteSpace: 'normal', wordBreak: 'break-word', width: '100%', textAlign: 'left' }}
                  disabled={deleteAccountSaving}
                  onClick={async () => {
                    setDeleteAccountSaving(true);
                    try {
                      await api.del('/users/me', { delete_data: true });
                      await signOut();
                      navigate('/login');
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setDeleteAccountSaving(false);
                    }
                  }}
                >
                  Delete account and all my data
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ whiteSpace: 'normal', wordBreak: 'break-word', width: '100%', textAlign: 'left' }}
                  disabled={deleteAccountSaving}
                  onClick={async () => {
                    setDeleteAccountSaving(true);
                    try {
                      await api.del('/users/me', { delete_data: false });
                      await signOut();
                      navigate('/login');
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setDeleteAccountSaving(false);
                    }
                  }}
                >
                  Delete account only — keep team data
                </button>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setDeleteAccountStep(1)}>← Back</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}