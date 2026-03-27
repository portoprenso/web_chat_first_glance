import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeaders,
  createTestContext,
  parseJsonBody,
  registerUser,
  resetDatabase,
} from './helpers.js';

let context: Awaited<ReturnType<typeof createTestContext>>;

describe('auth flows', () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('registers, refreshes, and logs out a session', async () => {
    const register = await registerUser(context.app, {
      email: 'alice@example.com',
      password: 'password123',
      displayName: 'Alice',
    });

    expect(register.session.user.email).toBe('alice@example.com');
    expect(register.session.accessToken).toBeTruthy();

    const refreshResponse = await context.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: {
        cookie: register.cookie,
      },
    });
    const refreshedSession = parseJsonBody<{
      accessToken: string;
    }>(refreshResponse.body);

    expect(refreshResponse.statusCode).toBe(200);
    expect(refreshedSession.accessToken).not.toBe(register.session.accessToken);

    const protectedResponse = await context.app.inject({
      method: 'GET',
      url: '/chats',
      headers: authHeaders(register.session.accessToken),
    });

    expect(protectedResponse.statusCode).toBe(200);

    const logoutResponse = await context.app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: {
        cookie: register.cookie,
      },
    });

    expect(logoutResponse.statusCode).toBe(200);

    const staleRefresh = await context.app.inject({
      method: 'POST',
      url: '/auth/refresh',
      headers: {
        cookie: register.cookie,
      },
    });

    expect(staleRefresh.statusCode).toBe(401);
  });

  it('rejects protected endpoints without an access token', async () => {
    const response = await context.app.inject({
      method: 'GET',
      url: '/chats',
    });
    const payload = parseJsonBody<{
      error: {
        code: string;
      };
    }>(response.body);

    expect(response.statusCode).toBe(401);
    expect(payload.error.code).toBe('UNAUTHORIZED');
  });
});
