import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import Modal from './Modal';

export default function LiveViewModal({ gameId, viewCode, onClose }) {
  const url = `https://app.gridiron-stats.co/live/${viewCode}/${gameId}`;
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
          {copied ? (
            <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><polyline points="20 6 9 17 4 12"/></svg>Copied</>
          ) : (
            <><svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight:5,verticalAlign:'middle'}}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</>
          )}
        </button>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}