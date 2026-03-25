import Modal from './Modal';

export default function UpgradeModal({ limit, onCheckout, onClose }) {
  return (
    <Modal title="Upgrade Gridiron Stats" onClose={onClose}>
      <p style={{ color: 'var(--gray-300)', marginBottom: 20 }}>
        {limit === 'club'
          ? "You're on the Individual plan which includes 1 team."
          : limit === 'teams'
            ? "You've reached the free plan limit of 1 team."
            : "You've reached the free plan limit of 3 games."}
        {' '}{limit === 'club' ? 'Upgrade to Club for unlimited teams.' : `Upgrade to unlock unlimited ${limit === 'teams' ? 'teams and ' : ''}games and players.`}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {limit !== 'club' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Individual</div>
            <div style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 12 }}>1 team · Unlimited games & players</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary btn-sm" onClick={() => onCheckout('individual_monthly')}>£5/month</button>
              <button className="btn btn-secondary btn-sm" onClick={() => onCheckout('individual_annual')}>£50/year</button>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 4 }}>Club <span className="tag tag-gold" style={{ fontSize: '0.7rem' }}>Best value</span></div>
          <div style={{ color: 'var(--gray-300)', fontSize: '0.88rem', marginBottom: 12 }}>Unlimited teams · Unlimited games & players</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => onCheckout('club_monthly')}>£15/month</button>
            <button className="btn btn-secondary btn-sm" onClick={() => onCheckout('club_annual')}>£150/year</button>
          </div>
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', textAlign: 'center' }}>
        Prices include VAT · Cancel anytime · Secure payment via Stripe
      </p>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Maybe later</button>
      </div>
    </Modal>
  );
}
