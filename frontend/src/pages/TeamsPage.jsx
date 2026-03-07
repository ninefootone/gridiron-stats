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
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', season: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/teams').then(setTeams).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const team = await api.post('/teams', form);
      setTeams(prev => [team, ...prev]);
      setShowModal(false);
      setForm({ name: '', season: '', description: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="spinner" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Teams</div>
          <div className="page-subtitle">Manage your squads and track the season</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + New Team
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="icon">🏟️</div>
          <p>No teams yet. Create your first team to get started.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {teams.map(team => (
            <div key={team.id} className={styles.teamCard} onClick={() => navigate(`/teams/${team.id}`)}>
              <div className={styles.teamName}>{team.name}</div>
              {team.season && <div className={styles.season}>{team.season}</div>}
              <div className={styles.stats}>
                <span className="stat-badge">👥 {team.player_count} players</span>
                <span className="stat-badge">🏈 {team.game_count} games</span>
              </div>
              {team.description && <p className={styles.desc}>{team.description}</p>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Team" onClose={() => setShowModal(false)}>
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
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Team'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
