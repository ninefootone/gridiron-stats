import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from './Modal';

export default function LiveViewModal({ gameId, onClose }) {
  const url = `https://app.gridiron-stats.co/live/${gameId}`;
  const [copied, setCopied] = useState(false);

  function copyUrl() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal title="Live View" onClose={onClose}>
      <p style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 20 }}>
        Share this link or QR code with parents and supporters to follow the game live — no login required.
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ background: '#fff', padding: 16, borderRadius: 12 }}>
          <QRCodeSVG value={url} size={180} />
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ flex: 1, fontSize: '0.78rem', color: 'var(--gray-300)', wordBreak: 'break-all' }}>{url}</span>
        <button className="btn btn-secondary btn-sm" onClick={copyUrl}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}