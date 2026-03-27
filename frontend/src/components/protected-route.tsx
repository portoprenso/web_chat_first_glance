import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from '../store/auth-store';
import { Loader } from './loader';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === 'bootstrapping') {
    return <Loader label="Restoring session…" />;
  }

  if (status !== 'authenticated') {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return <>{children}</>;
}
