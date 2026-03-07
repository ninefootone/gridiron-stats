import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div className="spinner" style={{ marginTop: '120px' }} />;
  if (isAuthenticated) return <Navigate to="/teams" replace />;

  return (
    <div className={styles.page}>
      <div className={styles.backdrop} />
      <div className={styles.card}>
        <div className={styles.icon}>🏈</div>
        <h1 className={styles.title}>Gridiron Stats</h1>
        <p className={styles.subtitle}>Track every yard, every play, every player — all season long.</p>
        <button
          className={`btn btn-primary ${styles.loginBtn}`}
          onClick={() => loginWithRedirect()}
        >
          Sign In to Get Started
        </button>
        <p className={styles.providers}>Google · Microsoft · Apple · Email</p>
      </div>
    </div>
  );
}
