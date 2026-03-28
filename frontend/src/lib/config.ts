import { z } from 'zod';

const configSchema = z.object({
  VITE_API_URL: z.string().url().optional(),
  VITE_WS_URL: z.string().url().optional(),
});

const LOCAL_BACKEND_PORT = '3000';
const VITE_DEV_SERVER_PORT = '5173';

function isTestMode(): boolean {
  return import.meta.env.MODE === 'test';
}

function getBrowserUrl(): URL | null {
  if (typeof window === 'undefined' || !window.location.origin || window.location.origin === 'null') {
    return null;
  }

  return new URL(window.location.origin);
}

function getBrowserOrigin(): string | null {
  return getBrowserUrl()?.toString() ?? null;
}

function getDirectViteBackendOrigin(): string | null {
  if (!import.meta.env.DEV) {
    return null;
  }

  const browserUrl = getBrowserUrl();

  if (!browserUrl || browserUrl.port !== VITE_DEV_SERVER_PORT) {
    return null;
  }

  browserUrl.protocol = 'http:';
  browserUrl.port = LOCAL_BACKEND_PORT;
  browserUrl.pathname = '/';
  browserUrl.search = '';
  browserUrl.hash = '';

  return browserUrl.toString();
}

function getDefaultApiUrl(): string {
  if (isTestMode()) {
    return `http://localhost:${LOCAL_BACKEND_PORT}`;
  }

  return getDirectViteBackendOrigin() ?? getBrowserOrigin() ?? `http://localhost:${LOCAL_BACKEND_PORT}`;
}

function getDefaultWebSocketUrl(): string {
  if (isTestMode()) {
    return `ws://localhost:${LOCAL_BACKEND_PORT}/api/ws`;
  }

  const directViteBackendOrigin = getDirectViteBackendOrigin();

  if (directViteBackendOrigin) {
    const url = new URL('/api/ws', directViteBackendOrigin);
    url.protocol = 'ws:';
    return url.toString();
  }

  const browserOrigin = getBrowserOrigin();

  if (!browserOrigin) {
    return `ws://localhost:${LOCAL_BACKEND_PORT}/api/ws`;
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
