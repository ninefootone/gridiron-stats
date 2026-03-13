import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'pwa_install_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;

    if (isIOS()) {
      setShowIOS(true);
      setVisible(true);
      return;
    }

    function handlePrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem(DISMISSED_KEY, '1');
  }

  if (!visible) return null;

  return (
    <div style={{
      margin: '16px 0 0',
      padding: '12px 16px',
      background: 'rgba(245,166,35,0.12)',
      border: '1px solid rgba(245,166,35,0.3)',
      borderRadius: 'var(--radius)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontSize: '0.85rem',
    }}>
      <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>📲</span>
      <span style={{ flex: 1, color: 'var(--gray-100)' }}>
        {showIOS
          ? <>Install the app — tap <strong>Share</strong> then <strong>Add to Home Screen</strong></>
          : <>Install Gridiron Stats for quick access from your home screen</>
        }
      </span>
      {!showIOS && (
        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={install}>
          Install
        </button>
      )}
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', color: 'var(--gray-500)', cursor: 'pointer', fontSize: '1rem', flexShrink: 0, padding: 0 }}
      >
        ✕
      </button>
    </div>
  );
}