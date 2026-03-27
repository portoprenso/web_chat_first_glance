import type { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';

import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';
import { queryClient } from './query-client';

function Bootstrapper() {
  useAuthBootstrap();
  return null;
}

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <Bootstrapper />
      {children}
    </QueryClientProvider>
  );
}
