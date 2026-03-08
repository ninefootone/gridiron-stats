import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';
import styles from './TeamsPage.module.css';

export default function TeamsPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [form, setForm] = useState({ name: '', season: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    api.get('/teams').then(setTeams).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
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
      const { team } = await api.post('/teams/join', { code: joinCode });
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

  function copyCode(code, id) {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
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

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏟️</div>
          <p>No teams yet. Create a team or join one with a code.</p>
        </div>
      ) : (
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
              {team.join_code && team.my_role === 'admin' && (
                <div
                  className={styles.joinCode}
                  onClick={e => { e.stopPropagation(); copyCode(team.join_code, team.id); }}
                  title="Click to copy join code"
                >
                  <span className={styles.joinCodeLabel}>Join Code</span>
                  <span className={styles.joinCodeValue}>{team.join_code}</span>
                  <span className={styles.joinCodeCopy}>{copiedCode === team.id ? '✓ Copied!' : '📋 Copy'}</span>
                </div>
              )}
              {team.description && <p className={styles.desc}>{team.description}</p>}
            </div>
          ))}
        </div>
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
              <input className="form-control" value={form.season} onChange={e => setForm(p => ({ ...p, season: e.target.value }))} placeholder="e.g. 2025/26" />
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
            <p style={{ color: 'var(--gray-300)', marginBottom: 16, fontSize: '0.95rem' }}>
              Ask your head coach for the 6-character join code for your team.
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
    </div>
  );
}