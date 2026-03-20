import { SignIn, useAuth } from '@clerk/react';
import { Navigate } from 'react-router-dom';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return <div className="spinner" style={{ marginTop: '120px' }} />;
  if (isSignedIn) return <Navigate to="/teams" replace />;

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.brand}>
          <div className={styles.icon}>
		<img src="/football.svg" alt="" style={{ width: 64, height: 64 }} />
	  </div>
          <h1 className={styles.title}>Gridiron Stats</h1>
          <p className={styles.subtitle}>Track every yard, every play, every player — all season long.</p>
        </div>
        <SignIn routing="hash" />
      </div>
      <div className={styles.backdrop} />
    </div>
  );
}