import { useUser } from '@clerk/react';

export default function DrillsPage() {
  const { user } = useUser();
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Drills</h1>
          <p className="page-subtitle">Your drill library and session planner</p>
        </div>
      </div>
      <p className="text-muted">Coming soon — drill library loading…</p>
      <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 8 }}>Your Clerk ID: {user?.id}</p>
    </div>
  );
}