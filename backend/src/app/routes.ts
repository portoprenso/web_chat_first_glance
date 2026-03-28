export const API_PREFIX = '/api';
export const AUTH_ROUTE_PREFIX = '/auth';

export const API_DOCS_ROUTE = `${API_PREFIX}/docs`;
export const API_HEALTH_ROUTE = `${API_PREFIX}/health`;
export const API_WEBSOCKET_ROUTE = `${API_PREFIX}/ws`;
export const AUTH_COOKIE_PATH = `${API_PREFIX}${AUTH_ROUTE_PREFIX}`;

export function apiRoute(path: string): string {
  return `${API_PREFIX}${path}`;
}
