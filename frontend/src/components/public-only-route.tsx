import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { useAuthStore } from '../store/auth-store';
import { Loader } from './loader';

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status);

  if (status === 'bootstrapping') {
    return <Loader label="Restoring session…" />;
  }

  if (status === 'authenticated') {
    return <Navigate replace to="/" />;
  }

  return <>{children}</>;
}
