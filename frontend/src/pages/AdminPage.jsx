import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

export default function AdminPage() {
  const api = useApi();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users/admin/stats')
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" />;
  if (error) return <div className="empty-state"><p>{error}</p></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="page-subtitle">Platform overview</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Users', value: data.stats.users },
          { label: 'Teams', value: data.stats.teams },
          { label: 'Players', value: data.stats.players },
          { label: 'Games', value: data.stats.games },
        ].map(s => (
          <div key={s.label} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '20px 16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--gray-300)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--gray-300)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>All Teams</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.teams.map(team => (
          <div key={team.id} style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{team.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--gray-300)', marginTop: 2 }}>
                Created by {team.creator_name || 'Unknown'}
                {team.season && ` · ${team.season}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="stat-badge">{team.member_count} members</span>
              <span className="stat-badge">{team.player_count} players</span>
              <span className="stat-badge">{team.game_count} games</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}