import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import styles from './TeamsPage.module.css';
import { useUser } from '@clerk/react';
import { useHelp } from '../context/HelpContext';
import InstallBanner from '../components/shared/InstallBanner';

export default function TeamsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [form, setForm] = useState({ name: '', season: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinType, setJoinType] = useState('join');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({ name: '', email: '', message: '' });
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const { user } = useUser();
  const { openHelp } = useHelp();
  const [shareTeam, setShareTeam] = useState(null);

  useEffect(() => {
    api.get('/teams').then(setTeams).catch(console.error).finally(() => setLoading(false));
  }, []);

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
      setError(err.message);
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

async function leaveTeam(e, teamId) {
    e.stopPropagation();
    if (!confirm('Remove this team from your list? You can rejoin with the code later.')) return;
    await api.del(`/teams/${teamId}/leave`);
    setTeams(prev => prev.filter(t => t.id !== teamId));
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
            <button className="btn btn-primary" onClick={() => { setShowCreateModal(true); setError(''); }}>
              + New Team
            </button>
          </div>
        </div>
      )}

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="icon" style={{ filter: 'none', opacity: 1 }}>🏈</div>
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
		{team.my_role === 'member' && <span className="tag tag-gray" style={{ alignSelf: 'center' }}>Member</span>}
              </div>
              {team.my_role === 'admin' && (
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--gray-300)', alignSelf: 'flex-start' }}
                  onClick={e => { e.stopPropagation(); setShareTeam(team); }}
                >
                  🔗 Share Codes
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
          💬 Give Feedback
        </button>
      </div>

      {feedbackModal && (
        <Modal title="Give Feedback" onClose={() => { setFeedbackModal(false); setFeedbackSent(false); setFeedbackError(''); }}>
          {feedbackSent ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🙌</div>
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
            Share these codes with your squad. The join code lets members log stats; the view code is read-only.
          </p>
          {shareTeam.join_code && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-300)', marginBottom: 6 }}>Join Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.15em', flex: 1 }}>{shareTeam.join_code}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => copyCode(shareTeam.join_code, shareTeam.id + '_join')}>
                  {copiedCode === shareTeam.id + '_join' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}
          {shareTeam.view_code && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-300)', marginBottom: 6 }}>View Code</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius)', padding: '12px 16px' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, letterSpacing: '0.15em', flex: 1 }}>{shareTeam.view_code}</span>
                <button className="btn btn-secondary btn-sm" onClick={() => copyCode(shareTeam.view_code, shareTeam.id + '_view')}>
                  {copiedCode === shareTeam.id + '_view' ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-primary" onClick={() => { setShareTeam(null); setCopiedCode(null); }}>Done</button>
          </div>
        </Modal>
      )}
    </div>
  );
}