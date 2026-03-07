import { useAuth0 } from '@auth0/auth0-react';
import { useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export function useApi() {
  const { getAccessTokenSilently } = useAuth0();

  const request = useCallback(async (path, options = {}) => {
    const token = await getAccessTokenSilently();
    const res = await fetch(`${BASE_URL}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  }, [getAccessTokenSilently]);

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: (path) => request(path, { method: 'DELETE' }),
  };
}
