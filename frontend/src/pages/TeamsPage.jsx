import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import styles from './TeamsPage.module.css';
import { useUser } from '@clerk/react';
import { useHelp } from '../context/HelpContext';
import InstallBanner from '../components/shared/InstallBanner';
import ConfirmModal, { AlertModal } from '../components/shared/ConfirmModal';
import { useUpgrade } from '../context/UpgradeContext';

export default function TeamsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [form, setForm] = useState({ name: '', season: '', description: '', team_type: null });
  const [joinCode, setJoinCode] = useState('');
  const [joinType, setJoinType] = useState('join');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ name: '', email: '', message: '' });
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const { user } = useUser();
  const { openHelp } = useHelp();
  const [shareTeam, setShareTeam] = useState(null);
  const location = useLocation();
  const { openUpgrade } = useUpgrade();
  const [showChooseTeamModal, setShowChooseTeamModal] = useState(false);

  useEffect(() => {
    api.get('/teams').then(data => {
      setTeams(data);
      const adminTeams = data.filter(t => t.my_role === 'admin');
      const hasRestricted = adminTeams.some(t => t.restricted);
      const hasActive = adminTeams.some(t => !t.restricted);
      if (hasRestricted && !hasActive && adminTeams.length > 1) setShowChooseTeamModal(true);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('upgraded') === 'true') {
      window.history.replaceState({}, '', '/teams');
      setShowCreateModal(true);
    }
    if (params.get('upgrade') === 'true') {
      window.history.replaceState({}, '', '/teams');
      openUpgrade('teams');
    }
  }, [location.search]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (form.season && !/^\d{4}$/.test(form.season)) {
      setError('Season must be a 4-digit year e.g. 2026');
      setSaving(false);
      return;
    }
    setSaving(true); setError('');
    try {
      const team = await api.post('/teams', form);
      setTeams(prev => [team, ...prev]);
      setShowCreateModal(false);
      setForm({ name: '', season: '', description: '' });
    } catch (err) {
      if (err.upgrade_required) {
        setShowCreateModal(false);
        openUpgrade(err.limit);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setSaving(true); setError('');
    try {
      const endpoint = joinType === 'view' ? '/teams/view' : '/teams/join';
      const { team } = await api.post(endpoint, { code: joinCode });
      setTeams(prev => [...prev, team]);
      setShowJoinModal(false);
      setJoinCode('');
      navigate(`/teams/${team.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function leaveTeam(e, teamId) {
    e.stopPropagation();
    setConfirmModal({
      message: 'Remove this team from your list? You can rejoin with the code later.',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        await api.del(`/teams/${teamId}/leave`);
        setTeams(prev => prev.filter(t => t.id !== teamId));
      },
    });
  }

  function copyCode(code, id) {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      {teams.length > 0 && (
        <div className="page-header">
          <div>
            <div className="page-title">My Teams</div>
            <div className="page-subtitle">Manage your squads and track the season</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => { setShowJoinModal(true); setError(''); }}>
              Join Team
            </button>
            <button className="btn btn-primary" onClick={async () => { 
              const sub = await api.get('/billing/subscription');
              const adminTeams = teams.filter(t => t.my_role === 'admin').length;
              if (sub.plan === 'free' && adminTeams >= 1) {
                openUpgrade('teams');
                  return;
                }
              if (sub.plan === 'individual' && adminTeams >= 1) {
                openUpgrade('club');
                return;
              }
              setShowCreateModal(true); setError(''); 
            }}>
              + New Team
            </button>
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ filter: 'none', opacity: 1 }}>
	  	<img src="/football.svg" alt="" style={{ width: 48, height: 48 }} />
	  </div>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: '1.05rem', marginBottom: 0, color: '#ffffff' }}>Welcome to</p>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', fontSize: '2.05rem', marginBottom: 8, color: '#ffffff' }}>Gridiron Stats</p>
          <p style={{ color: 'var(--gray-300)', marginBottom: 24 }}>The fastest way to track player stats, manage your roster, and follow your team's season from the sideline.</p>
          <button className="btn btn-primary" style={{ marginBottom: 12 }} onClick={() => { setShowCreateModal(true); setError(''); }}>+ Create Your First Team</button>
          <div style={{ marginBottom: 12 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => { setShowJoinModal(true); setError(''); }}>Join with a code</button>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }} onClick={openHelp}>How does it work?</button>
        </div>
      ) : (
        <>
        <div className={styles.grid}>
          {teams.map(team => (
            <div key={team.id} className={styles.teamCard} onClick={() => navigate(`/teams/${team.id}`)}>
              <div className={styles.teamName}>{team.name}</div>
              {team.season && <div className={styles.season}>{team.season}</div>}
              <div className={styles.stats}>
                <span className="stat-badge">{team.player_count} players</span>
                <span className="stat-badge">{team.game_count} games</span>
                {team.my_role === 'admin' && <span className="tag tag-gold" style={{ alignSelf: 'center' }}>Admin</span>}
                {team.my_role === 'member' && <span className="tag tag-gray" style={{ alignSelf: 'center' }}>Coach</span>}
                {team.team_type === 'flag' && <span className="tag tag-green" style={{ alignSelf: 'center' }}>Flag</span>}
                {team.team_type === 'contact' && <span className="tag tag-green" style={{ alignSelf: 'center' }}>Contact</span>}
              </div>
              {team.my_role === 'admin' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-300)', alignSelf: 'flex-start' }}
                  onClick={e => { e.stopPropagation(); setShareTeam(team); }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6,verticalAlign:'middle'}}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                  Share Codes
                </button>
              )}
              {team.description && <p className={styles.desc}>{team.description}</p>}
              {(team.my_role === 'member' || team.my_role === 'viewer') && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-300)' }}
                  onClick={e => leaveTeam(e, team.id)}
                >
                  Leave Team
                </button>
              )}
            </div>
          ))}
        </div>
        <InstallBanner />
	</>
      )}

      {showCreateModal && (
        <Modal title="New Team" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate}>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Team Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Thunder Hawks" required />
            </div>
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Season</label>
              <input
                className="form-control"
                value={form.season}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setForm(p => ({ ...p, season: val }));
                }}
                placeholder="e.g. 2026"
                maxLength={4}
              />
            </div>
                        <div className="form-group" style={{ marginBottom: 14 }}>
              <label>Game Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${form.team_type === 'flag' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm(p => ({ ...p, team_type: p.team_type === 'flag' ? null : 'flag' }))}
                >
                  🚩 Flag
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${form.team_type === 'contact' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setForm(p => ({ ...p, team_type: p.team_type === 'contact' ? null : 'contact' }))}
                >
                  🏈 Contact
                </button>
                {form.team_type && (
                  <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-500)' }} onClick={() => setForm(p => ({ ...p, team_type: null }))}>
                    Clear
                  </button>
                )}
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 6 }}>Optional — filters positions and stats for your game type</p>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Description</label>
              <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes" />
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Team'}</button>
            </div>
          </form>
        </Modal>
      )}

      {showJoinModal && (
        <Modal title="Join a Team" onClose={() => setShowJoinModal(false)}>
          <form onSubmit={handleJoin}>
            {error && <div className="alert alert-error">{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className={`btn ${joinType === 'join' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setJoinType('join')}
              >
                Join (can log stats)
              </button>
              <button
                type="button"
                className={`btn ${joinType === 'view' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setJoinType('view')}
              >
                View only
              </button>
            </div>
            <p style={{ color: 'var(--gray-300)', marginBottom: 16, fontSize: '0.95rem' }}>
              {joinType === 'join'
                ? 'Ask your head coach for the 6-character join code.'
                : 'Ask your head coach for the 6-character view code.'}
            </p>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Join Code</label>
              <input
                className="form-control"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB3X9K"
                maxLength={10}
                autoFocus
                style={{ fontSize: '1.4rem', letterSpacing: '0.2em', textTransform: 'uppercase', textAlign: 'center' }}
              />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowJoinModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !joinCode.trim()}>{saving ? 'Joining...' : 'Join Team'}</button>
            </div>
          </form>
        </Modal>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.85rem', color: 'var(--gray-300)' }}
          onClick={() => {
            setFeedbackForm({
              name: user?.fullName || '',
              email: user?.primaryEmailAddress?.emailAddress || '',
              message: '',
            });
            setFeedbackSent(false);
            setFeedbackError('');
            setFeedbackModal(true);
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:6,verticalAlign:'middle'}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Give Feedback
        </button>
      </div>

      {feedbackModal && (
        <Modal title="Give Feedback" onClose={() => { setFeedbackModal(false); setFeedbackSent(false); setFeedbackError(''); }}>
          {feedbackSent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ marginBottom: 12 }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>Thanks for the feedback!</div>
              <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem' }}>We'll take a look and get back to you if needed.</p>
            </div>
          ) : (
            <>
              <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem', marginBottom: 16 }}>
                Got a suggestion or spotted a bug? We'd love to hear from you.
              </p>
              {feedbackError && <div className="alert alert-error">{feedbackError}</div>}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Your Name</label>
                <input
                  className="form-control"
                  value={feedbackForm.name}
                  onChange={e => setFeedbackForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Jon"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>Email (optional — so we can reply)</label>
                <input
                  className="form-control"
                  type="email"
                  value={feedbackForm.email}
                  onChange={e => setFeedbackForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Message *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={feedbackForm.message}
                  onChange={e => setFeedbackForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Tell us what you think..."
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setFeedbackModal(false)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!feedbackForm.message.trim() || feedbackSending}
                  onClick={async () => {
                    setFeedbackSending(true); setFeedbackError('');
                    try {
                      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/feedback`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(feedbackForm),
                      });
                      if (!res.ok) throw new Error('Failed to send');
                      setFeedbackSent(true);
                      setFeedbackForm({ name: '', email: '', message: '' });
                    } catch (err) {
                      setFeedbackError('Something went wrong — please try again.');
                    } finally {
                      setFeedbackSending(false);
                    }
                  }}
                >
                  {feedbackSending ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </>
          )}
        </Modal>
      )}

      {shareTeam && (
        <Modal title={`Share — ${shareTeam.name}`} onClose={() => { setShareTeam(null); setCopiedCode(null); }}>
          <p style={{ color: 'var(--gray-300)', fontSize: '0.9rem', marginBottom: 20 }}>
            Share these codes with your squad. The join code lets coaches log stats; the view code is read-only.
          </p>
          {shareTeam.join_code && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-300)', marginBottom: 6 }}>Join Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.15em', flex: 1 }}>{shareTeam.join_code}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => copyCode(shareTeam.join_code, shareTeam.id + '_join')}>
                  {copiedCode === shareTeam.id + '_join' ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><polyline points="20 6 9 17 4 12"/></svg>Copied</>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
                  )}
                </button>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-400)', alignSelf: 'flex-start' }}
                onClick={() => {
                  const message = `Hi! I'd like to add you as a coach on ${shareTeam.name} in Gridiron Stats.\n\n1. Access the app at app.gridiron-stats.co\n2. Create a free account\n3. Tap 'Join Team' and enter this code: ${shareTeam.join_code}\n\nSee you on the sideline! 🏈`;
                  navigator.clipboard.writeText(message);
                  setCopiedCode(shareTeam.id + '_invite');
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
              >
                {copiedCode === shareTeam.id + '_invite' ? '✓ Message copied' : '✉️ Copy invite message'}
              </button>

            </div>
          )}
          {shareTeam.view_code && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-300)', marginBottom: 6 }}>View Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.15em', flex: 1 }}>{shareTeam.view_code}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => copyCode(shareTeam.view_code, shareTeam.id + '_view')}>
                  {copiedCode === shareTeam.id + '_view' ? (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><polyline points="20 6 9 17 4 12"/></svg>Copied</>
                  ) : (
                    <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
                  )}
                </button>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-400)', alignSelf: 'flex-start' }}
                onClick={() => {
                  const message = `Hi! You can follow ${shareTeam.name} on Gridiron Stats to see live player stats and scores.\n\n1. Visit app.gridiron-stats.co\n2. Create a free account\n3. Tap 'Join Team' and enter this code: ${shareTeam.view_code}\n\nYou'll have read-only access — perfect for following the season! 🏈`;
                  navigator.clipboard.writeText(message);
                  setCopiedCode(shareTeam.id + '_view_invite');
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
              >
                {copiedCode === shareTeam.id + '_view_invite' ? '✓ Message copied' : '✉️ Copy invite message'}
              </button>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={() => { setShareTeam(null); setCopiedCode(null); }}>Done</button>
          </div>
        </Modal>
      )}
      {showChooseTeamModal && (
        <Modal title="Choose Your Active Team" onClose={() => setShowChooseTeamModal(false)}>
          <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 20 }}>
            Your plan has changed. You can only have 1 active team on your current plan. Choose which team to keep active — others will become read-only.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {teams.filter(t => t.my_role === 'admin').map(t => (
              <button
                key={t.id}
                className={`btn ${!t.restricted ? 'btn-primary' : 'btn-secondary'}`}
                style={{ textAlign: 'left', padding: '12px 16px', whiteSpace: 'normal', wordBreak: 'break-word', width: '100%' }}
                onClick={async () => {
                  await api.post(`/teams/${t.id}/set-active`, {});
                  const updated = await api.get('/teams');
                  setTeams(updated);
                  setShowChooseTeamModal(false);
                }}
              >
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                {t.season && <div style={{ fontSize: '0.78rem', color: t.restricted ? 'var(--gray-300)' : '#fff' }}>{t.season}</div>}
                {!t.restricted && <div style={{ fontSize: '0.72rem', color: '#fff', marginTop: 2, opacity: 0.8 }}>Currently active</div>}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)' }}>
            Upgrade to Club plan for unlimited teams.
          </p>
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={() => setShowChooseTeamModal(false)}>Decide later</button>
            <button className="btn btn-secondary" onClick={() => { setShowChooseTeamModal(false); openUpgrade('club'); }}>Upgrade to Club</button>
          </div>
        </Modal>
      )}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title || 'Are you sure?'}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel || 'Confirm'}
          confirmClass={confirmModal.confirmClass || 'btn-danger'}
          onConfirm={confirmModal.onConfirm}
          onClose={() => setConfirmModal(null)}
        />
      )}
      {alertModal && (
        <AlertModal
          message={alertModal}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
}