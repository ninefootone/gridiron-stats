import { useAuth0 } from '@auth0/auth0-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import TeamsPage from './pages/TeamsPage';
import TeamDetailPage from './pages/TeamDetailPage';
import GamePage from './pages/GamePage';
import PlayerPage from './pages/PlayerPage';
import LeaderboardPage from './pages/LeaderboardPage';

function PrivateRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();
  if (isLoading) return <div className="spinner" style={{ marginTop: '120px' }} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { isLoading } = useAuth0();
  if (isLoading) return <div className="spinner" style={{ marginTop: '120px' }} />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/teams" replace />} />
        <Route path="teams" element={<TeamsPage />} />
        <Route path="teams/:teamId" element={<TeamDetailPage />} />
        <Route path="teams/:teamId/games/:gameId" element={<GamePage />} />
        <Route path="teams/:teamId/players/:playerId" element={<PlayerPage />} />
        <Route path="teams/:teamId/leaderboard" element={<LeaderboardPage />} />
      </Route>
    </Routes>
  );
}
