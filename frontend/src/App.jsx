import { useAuth } from '@clerk/react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import TeamsPage from './pages/TeamsPage';
import AdminPage from './pages/AdminPage';
import TeamDetailPage from './pages/TeamDetailPage';
import GamePage from './pages/GamePage';
import PlayerPage from './pages/PlayerPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LivePage from './pages/LivePage';
import CookieBanner from './components/shared/CookieBanner';
import OfflineBanner from './components/shared/OfflineBanner';

function PrivateRoute({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="spinner" style={{ marginTop: '120px' }} />;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return <div className="spinner" style={{ marginTop: '120px' }} />;

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/teams" replace />} />
          <Route path="teams" element={<TeamsPage />} />
          <Route path="teams/:teamId" element={<TeamDetailPage />} />
          <Route path="teams/:teamId/games/:gameId" element={<GamePage />} />
          <Route path="teams/:teamId/players/:playerId" element={<PlayerPage />} />
          <Route path="teams/:teamId/leaderboard" element={<LeaderboardPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="/live/:gameId" element={<LivePage />} />
          <Route path="*" element={<Navigate to="/teams" replace />} />
      </Routes>
      <CookieBanner />
      <OfflineBanner />
    </>
  );
}