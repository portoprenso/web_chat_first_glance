import { appConfig } from '../config';
import { useAuthStore } from '../../store/auth-store';
import { ApiError } from './errors';

type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
};

type JsonMethod = 'GET' | 'POST';

type RequestOptions = {
  body?: BodyInit | Record<string, unknown>;
  headers?: HeadersInit;
  method: JsonMethod;
  path: string;
  pathParams?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  skipAuth?: boolean;
  skipRefresh?: boolean;
};

let refreshPromise: Promise<boolean> | null = null;

function buildPath(template: string, pathParams?: Record<string, string>): string {
  let value = template;

  Object.entries(pathParams ?? {}).forEach(([key, entryValue]) => {
    value = value.replace(`{${key}}`, encodeURIComponent(entryValue));
  });

  return value;
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(path, appConfig.VITE_API_URL);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

function normalizeBody(body: RequestOptions['body']): BodyInit | undefined {
  if (!body) {
    return undefined;
  }

  if (body instanceof FormData || body instanceof Blob || typeof body === 'string') {
    return body;
  }

  return JSON.stringify(body);
}

function isJsonBody(body: RequestOptions['body']): boolean {
  return Boolean(body) && !(body instanceof FormData) && !(body instanceof Blob);
}

async function parseApiError(response: Response): Promise<ApiError> {
  let payload: ErrorResponse | undefined;

  try {
    payload = (await response.json()) as ErrorResponse;
  } catch {
    payload = undefined;
  }

  if (payload?.error) {
    return new ApiError(
      response.status,
      payload.error.code,
      payload.error.message,
      payload.error.details,
    );
  }

  return new ApiError(response.status, 'REQUEST_FAILED', 'Request failed.');
}

async function rawRequest(options: RequestOptions): Promise<Response> {
  const accessToken = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers);

  if (isJsonBody(options.body)) {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const path = buildPath(options.path, options.pathParams);
  return fetch(buildUrl(path, options.query), {
    method: options.method,
    headers,
    body: normalizeBody(options.body),
    credentials: 'include',
  });
}

function applySession(session: {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: {
    createdAt: string;
    displayName: string;
    email: string;
    id: string;
  };
}): void {
  useAuthStore.getState().setAuthenticated(session);
}

export async function refreshSessionRequest(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const response = await rawRequest({
          method: 'POST',
          path: '/api/auth/refresh',
          skipAuth: true,
          skipRefresh: true,
        });

        if (!response.ok) {
          useAuthStore.getState().clearAuth();
          return false;
        }

        const payload = (await response.json()) as {
          accessToken: string;
          accessTokenExpiresAt: string;
          user: {
            createdAt: string;
            displayName: string;
            email: string;
            id: string;
          };
        };

        applySession(payload);
        return true;
      } catch {
        useAuthStore.getState().clearAuth();
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }

  return refreshPromise;
}

export async function apiJsonRequest<T>(options: RequestOptions): Promise<T> {
  const response = await rawRequest(options);

  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshSessionRequest();

    if (refreshed) {
      const retried = await rawRequest({
        ...options,
        skipRefresh: true,
      });

      if (!retried.ok) {
        throw await parseApiError(retried);
      }

      return (await retried.json()) as T;
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  return (await response.json()) as T;
}

export async function apiBlobRequest(options: RequestOptions): Promise<{
  blob: Blob;
  fileName: string | null;
}> {
  const response = await rawRequest(options);

  if (response.status === 401 && !options.skipRefresh) {
    const refreshed = await refreshSessionRequest();

    if (refreshed) {
      return apiBlobRequest({
        ...options,
        skipRefresh: true,
      });
    }
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const disposition = response.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="([^"]+)"/);

  return {
    blob: await response.blob(),
    fileName: match?.[1] ?? null,
  };
}

export function setAuthSession(session: {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: {
    createdAt: string;
    displayName: string;
    email: string;
    id: string;
  };
}): void {
  applySession(session);
}
