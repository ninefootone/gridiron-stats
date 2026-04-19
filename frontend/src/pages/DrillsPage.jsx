import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import Modal from '../components/shared/Modal';

const TAGS = ['Flag', 'Contact', 'Offense', 'Defense', 'Special Teams', 'U10', 'U12', 'U14', 'U16', 'U18', 'Senior', 'Warm Up', 'Conditioning'];

function DrillCard({ drill, onEdit, onDelete, isOwner }) {
  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--white)' }}>{drill.title}</div>
          {drill.description && (
            <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 4, lineHeight: 1.5 }}>{drill.description}</div>
          )}
        </div>
        {isOwner && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => onEdit(drill)}>Edit</button>
            <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '0.78rem' }} onClick={() => onDelete(drill)}>Delete</button>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {(drill.tags || []).map(tag => (
          <span key={tag} style={{
            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
            color: 'var(--gold)', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem',
            fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>{tag}</span>
        ))}
        <span style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
          color: 'var(--gray-300)', borderRadius: 20, padding: '2px 10px', fontSize: '0.72rem',
          fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em'
        }}>{drill.visibility}</span>
      </div>
      {drill.youtube_url && (
        <a href={drill.youtube_url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: '0.82rem', color: 'var(--gold)', textDecoration: 'none' }}>
          ▶ Watch on YouTube
        </a>
      )}
    </div>
  );
}

function DrillRow({ drill, onEdit, onDelete, isOwner }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)'
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700, color: 'var(--white)', fontSize: '0.92rem' }}>{drill.title}</span>
        {drill.description && (
          <span className="text-muted" style={{ fontSize: '0.82rem', marginLeft: 10 }}>{drill.description.slice(0, 60)}{drill.description.length > 60 ? '…' : ''}</span>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {(drill.tags || []).slice(0, 3).map(tag => (
          <span key={tag} style={{
            background: 'rgba(212,175,55,0.12)', color: 'var(--gold)', borderRadius: 20,
            padding: '1px 8px', fontSize: '0.68rem', fontFamily: 'var(--font-display)',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>{tag}</span>
        ))}
      </div>
      {isOwner && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => onEdit(drill)}>Edit</button>
          <button className="btn btn-danger" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => onDelete(drill)}>Delete</button>
        </div>
      )}
    </div>
  );
}

function DrillForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    title: initial?.title || '',
    description: initial?.description || '',
    tags: initial?.tags || [],
    youtube_url: initial?.youtube_url || '',
    visibility: initial?.visibility || 'private',
  });

  function toggleTag(tag) {
    setForm(f => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag]
    }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label className="section-label">Title *</label>
        <input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Oklahoma Drill" />
      </div>
      <div>
        <label className="section-label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the drill…" style={{ resize: 'vertical' }} />
      </div>
      <div>
        <label className="section-label">Tags</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {TAGS.map(tag => (
            <button key={tag} type="button"
              onClick={() => toggleTag(tag)}
              style={{
                padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                background: form.tags.includes(tag) ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.06)',
                border: form.tags.includes(tag) ? '1px solid rgba(212,175,55,0.5)' : '1px solid rgba(255,255,255,0.12)',
                color: form.tags.includes(tag) ? 'var(--gold)' : 'var(--gray-300)',
              }}
            >{tag}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="section-label">YouTube URL</label>
        <input className="input" value={form.youtube_url} onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))} placeholder="https://youtube.com/watch?v=…" />
      </div>
      <div>
        <label className="section-label">Visibility</label>
        <select className="input" value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
          <option value="private">Private — only me</option>
          <option value="club">Club — coming soon</option>
          <option value="community">Community — visible to all coaches</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : 'Save Drill'}
        </button>
      </div>
    </div>
  );
}

export default function DrillsPage() {
  const api = useApi();
  const [tab, setTab] = useState('my');
  const [viewMode, setViewMode] = useState('list');
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editDrill, setEditDrill] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadDrills(); }, []);

  async function loadDrills() {
    setLoading(true);
    try {
      const data = await api.get('/drills');
      setDrills(data);
    } catch (e) {
      setError('Failed to load drills');
    } finally {
      setLoading(false);
    }
  }

  async function saveDrill(form) {
    setSaving(true);
    try {
      if (editDrill) {
        const updated = await api.put(`/drills/${editDrill.id}`, form);
        setDrills(ds => ds.map(d => d.id === updated.id ? updated : d));
      } else {
        const created = await api.post('/drills', form);
        setDrills(ds => [created, ...ds]);
      }
      setModalOpen(false);
      setEditDrill(null);
    } catch (e) {
      setError('Failed to save drill');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDrill(drill) {
    if (!window.confirm(`Delete "${drill.title}"?`)) return;
    try {
      await api.delete(`/drills/${drill.id}`);
      setDrills(ds => ds.filter(d => d.id !== drill.id));
    } catch (e) {
      setError('Failed to delete drill');
    }
  }

  const myDrills = drills.filter(d => d.is_owner);
  const communityDrills = drills.filter(d => d.visibility === 'community');

  const displayDrills = tab === 'my' ? myDrills : communityDrills;

  const tabStyle = (key) => ({
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.8rem',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    background: tab === key ? 'var(--gold)' : 'rgba(255,255,255,0.06)',
    color: tab === key ? '#000' : 'var(--gray-300)',
    transition: 'all 0.15s',
  });

  const viewBtn = (mode, label) => ({
    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.75rem',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    background: viewMode === mode ? 'rgba(255,255,255,0.15)' : 'transparent',
    color: viewMode === mode ? 'var(--white)' : 'var(--gray-300)',
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drills</h1>
          <p className="page-subtitle">Your drill library and session planner</p>
        </div>
        {tab === 'my' && (
          <button className="btn btn-primary" onClick={() => { setEditDrill(null); setModalOpen(true); }}>
            + Add Drill
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabStyle('my')} onClick={() => setTab('my')}>My Drills</button>
          <button style={tabStyle('community')} onClick={() => setTab('community')}>Community</button>
          <button style={tabStyle('sessions')} onClick={() => setTab('sessions')}>Sessions</button>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3 }}>
          <button style={viewBtn('list')} onClick={() => setViewMode('list')}>List</button>
          <button style={viewBtn('card')} onClick={() => setViewMode('card')}>Cards</button>
        </div>
      </div>

      {tab === 'sessions' ? (
        <p className="text-muted">Session planner coming in the next step.</p>
      ) : loading ? (
        <div className="spinner" />
      ) : displayDrills.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-300)' }}>
          {tab === 'my' ? (
            <>
              <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>No drills yet</p>
              <p style={{ fontSize: '0.85rem' }}>Add your first drill to get started</p>
            </>
          ) : (
            <p style={{ fontSize: '1.1rem' }}>No community drills yet — be the first to share one!</p>
          )}
        </div>
      ) : viewMode === 'card' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {displayDrills.map(d => (
            <DrillCard key={d.id} drill={d} isOwner={d.is_owner} onEdit={drill => { setEditDrill(drill); setModalOpen(true); }} onDelete={deleteDrill} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {displayDrills.map(d => (
            <DrillRow key={d.id} drill={d} isOwner={d.is_owner} onEdit={drill => { setEditDrill(drill); setModalOpen(true); }} onDelete={deleteDrill} />
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editDrill ? 'Edit Drill' : 'New Drill'} onClose={() => { setModalOpen(false); setEditDrill(null); }}>
          <DrillForm initial={editDrill} onSave={saveDrill} onClose={() => { setModalOpen(false); setEditDrill(null); }} saving={saving} />
        </Modal>
      )}
    </div>
  );
}