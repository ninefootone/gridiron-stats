import { createContext, useContext, useState } from 'react';
import UpgradeModal from '../components/shared/UpgradeModal';
import { useApi } from '../hooks/useApi';

const UpgradeContext = createContext(null);

export function useUpgrade() {
  return useContext(UpgradeContext);
}

export function UpgradeProvider({ children }) {
  const [upgradeModal, setUpgradeModal] = useState(null);
  const api = useApi();

  async function startCheckout(price_key) {
    try {
      const sub = await api.get('/billing/subscription');
      if (sub.stripe_customer_id && sub.status === 'active') {
        const { url } = await api.post('/billing/portal', {});
        window.location.href = url;
      } else {
        const { url } = await api.post('/billing/checkout', { price_key });
        window.location.href = url;
      }
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <UpgradeContext.Provider value={{ openUpgrade: (limit) => setUpgradeModal({ limit }) }}>
      {children}
      {upgradeModal && (
        <UpgradeModal
          limit={upgradeModal.limit}
          onCheckout={startCheckout}
          onClose={() => setUpgradeModal(null)}
        />
      )}
    </UpgradeContext.Provider>
  );
}
