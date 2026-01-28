import { useCallback, useEffect, useState } from 'react';
import { getCsrfToken, refreshCsrfToken, getCsrfHeaders } from '@/utils/csrf';

/**
 * Hook for managing CSRF tokens in React components
 */
export function useCsrf() {
  const [token, setToken] = useState<string>('');

  useEffect(() => {
    // Initialize token on mount
    setToken(getCsrfToken());
  }, []);

  const refresh = useCallback(() => {
    const newToken = refreshCsrfToken();
    setToken(newToken);
    return newToken;
  }, []);

  const getHeaders = useCallback(() => {
    return getCsrfHeaders();
  }, []);

  return {
    token,
    refresh,
    getHeaders,
  };
}
