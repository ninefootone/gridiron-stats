import { useState, useEffect } from 'react';

const GA_ID = 'G-NFRNCVPGTN';

function loadGA() {
  if (window.gaLoaded) return;
  window.gaLoaded = true;
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);
  script.onload = () => {
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID);
  };
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (consent === 'accepted') {
      loadGA();
    } else if (consent === 'declined') {
      // do nothing
    } else {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem('cookie_consent', 'accepted');
    loadGA();
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('cookie_consent', 'declined');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 80,
      left: 0,
      right: 0,
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      padding: '0 16px',
    }}>
      <div style={{
        background: 'var(--surface, #1e4a34)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '16px 20px',
        maxWidth: 560,
        width: '100%',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--gray-100, #f8f9fa)', lineHeight: 1.5 }}>
          We use cookies to understand how the app is used and improve it over time. See our{' '}
          <a href="https://gridiron-stats.co/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold, #f5a623)' }}>privacy policy</a>.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={accept}>Accept</button>
          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--gray-400)' }} onClick={decline}>Decline</button>
        </div>
      </div>
    </div>
  );
}
