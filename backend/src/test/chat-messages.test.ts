import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeaders,
  createTestContext,
  parseJsonBody,
  registerUser,
  resetDatabase,
} from './helpers.js';

let context: Awaited<ReturnType<typeof createTestContext>>;

describe('chat and message flows', () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('opens a direct chat and sends messages', async () => {
    const alice = await registerUser(context.app, {
      email: 'alice@example.com',
      password: 'password123',
      displayName: 'Alice',
    });
    await registerUser(context.app, {
      email: 'bob@example.com',
      password: 'password123',
      displayName: 'Bob',
    });

    const chatResponse = await context.app.inject({
      method: 'POST',
      url: '/chats/direct',
      headers: authHeaders(alice.session.accessToken),
      payload: {
        participantEmail: 'bob@example.com',
      },
    });

    expect(chatResponse.statusCode).toBe(200);
    const chat = parseJsonBody<{ id: string }>(chatResponse.body);

    const messageResponse = await context.app.inject({
      method: 'POST',
      url: `/chats/${chat.id}/messages`,
      headers: authHeaders(alice.session.accessToken),
      payload: {
        body: 'Hello Bob',
        attachmentIds: [],
      },
    });
    const createdMessage = parseJsonBody<{
      body: string | null;
    }>(messageResponse.body);

    expect(messageResponse.statusCode).toBe(201);
    expect(createdMessage.body).toBe('Hello Bob');

    const listResponse = await context.app.inject({
      method: 'GET',
      url: `/chats/${chat.id}/messages`,
      headers: authHeaders(alice.session.accessToken),
    });
    const listPayload = parseJsonBody<{
      items: Array<{
        body: string | null;
      }>;
    }>(listResponse.body);

    expect(listResponse.statusCode).toBe(200);
    expect(listPayload.items).toHaveLength(1);
    expect(listPayload.items[0]?.body).toBe('Hello Bob');
  });
});
