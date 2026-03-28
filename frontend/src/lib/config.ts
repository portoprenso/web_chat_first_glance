import { z } from 'zod';

const configSchema = z.object({
  VITE_API_URL: z.string().url().optional(),
  VITE_WS_URL: z.string().url().optional(),
});

function isLocalDevMode(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'test';
}

function getBrowserOrigin(): string | null {
  if (typeof window === 'undefined' || !window.location.origin || window.location.origin === 'null') {
    return null;
  }

  return window.location.origin;
}

function getDefaultApiUrl(): string {
  if (isLocalDevMode()) {
    return 'http://localhost:3000';
  }

  return getBrowserOrigin() ?? 'http://localhost:3000';
}

function getDefaultWebSocketUrl(): string {
  if (isLocalDevMode()) {
    return 'ws://localhost:3000/api/ws';
  }

  const browserOrigin = getBrowserOrigin();

  if (!browserOrigin) {
    return 'ws://localhost:3000/api/ws';
  }

  const url = new URL('/api/ws', browserOrigin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

const parsedConfig = configSchema.parse(import.meta.env);

export const appConfig = {
  VITE_API_URL: parsedConfig.VITE_API_URL ?? getDefaultApiUrl(),
  VITE_WS_URL: parsedConfig.VITE_WS_URL ?? getDefaultWebSocketUrl(),
};
