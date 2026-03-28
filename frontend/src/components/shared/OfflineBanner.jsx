import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    function handleOffline() { setOffline(true); }
    function handleOnline() { setOffline(false); }
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9998,
      background: '#d94f4f',
      color: '#fff',
      textAlign: 'center',
      padding: '10px 16px',
      fontSize: '0.88rem',
      fontWeight: 600,
    }}>
      ⚠️ No internet connection — stat logging unavailable. Connect to continue.
    </div>
  );
}
