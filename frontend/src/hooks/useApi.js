import { useAuth } from '@clerk/react';
import { useCallback } from 'react';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export function useApi() {
  const { getToken } = useAuth();

  const request = useCallback(async (path, options = {}) => {
    const token = await getToken();
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
      const error = new Error(err.error || 'Request failed');
      error.upgrade_required = err.upgrade_required || false;
      error.limit = err.limit || null;
      error.team_restricted = err.team_restricted || false;
      throw error;
    }
    return res.json();
  }, [getToken]);

  return {
    get: (path) => request(path),
    post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
    put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: (path) => request(path, { method: 'DELETE' }),
    patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  };
}