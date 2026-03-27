import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { useAuthStore } from '../store/auth-store';
import { useSocketStore } from '../store/socket-store';
import { server } from './server';

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  useAuthStore.getState().clearAuth();
  useSocketStore.getState().setStatus('idle', null);
});

afterAll(() => {
  server.close();
});
