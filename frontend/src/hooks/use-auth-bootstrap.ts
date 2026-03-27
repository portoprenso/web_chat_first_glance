import { useEffect } from 'react';

import { restoreSessionRequest } from '../features/auth/api';
import { useAuthStore } from '../store/auth-store';

export function useAuthBootstrap(): void {
  const status = useAuthStore((state) => state.status);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (status !== 'bootstrapping') {
      return;
    }

    let cancelled = false;

    void restoreSessionRequest().then((restored) => {
      if (!cancelled && !restored) {
        clearAuth();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clearAuth, status]);
}
