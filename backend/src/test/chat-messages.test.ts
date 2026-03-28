import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeaders,
  apiRoute,
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

  it('lists chats for an authenticated user', async () => {
    const alice = await registerUser(context.app, {
      email: 'alice@example.com',
      password: 'password123',
      displayName: 'Alice',
    });

    const response = await context.app.inject({
      method: 'GET',
      url: apiRoute('/chats'),
      headers: authHeaders(alice.session.accessToken),
    });

    expect(response.statusCode).toBe(200);
    expect(parseJsonBody<{ items: unknown[] }>(response.body)).toEqual({
      items: [],
    });
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
      url: apiRoute('/chats/direct'),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        participantEmail: 'bob@example.com',
      },
    });

    expect(chatResponse.statusCode).toBe(200);
    const chat = parseJsonBody<{ id: string }>(chatResponse.body);

    const messageResponse = await context.app.inject({
      method: 'POST',
      url: apiRoute(`/chats/${chat.id}/messages`),
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
      url: apiRoute(`/chats/${chat.id}/messages`),
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

  it('paginates older messages using the oldest returned message as the next cursor', async () => {
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
      url: apiRoute('/chats/direct'),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        participantEmail: 'bob@example.com',
      },
    });

    expect(chatResponse.statusCode).toBe(200);
    const chat = parseJsonBody<{ id: string }>(chatResponse.body);

    for (let index = 1; index <= 55; index += 1) {
      await context.prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: alice.session.user.id,
          body: `Message ${index}`,
          createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)),
        },
      });
    }

    const firstPageResponse = await context.app.inject({
      method: 'GET',
      url: apiRoute(`/chats/${chat.id}/messages`),
      headers: authHeaders(alice.session.accessToken),
    });
    const firstPage = parseJsonBody<{
      items: Array<{
        id: string;
        body: string | null;
      }>;
      nextCursor: string | null;
    }>(firstPageResponse.body);

    expect(firstPageResponse.statusCode).toBe(200);
    expect(firstPage.items).toHaveLength(50);
    expect(firstPage.items[0]?.body).toBe('Message 6');
    expect(firstPage.items[49]?.body).toBe('Message 55');
    expect(firstPage.nextCursor).toBe(firstPage.items[0]?.id);
    expect(firstPage.nextCursor).not.toBe(firstPage.items[49]?.id);

    const secondPageResponse = await context.app.inject({
      method: 'GET',
      url: apiRoute(`/chats/${chat.id}/messages?cursor=${firstPage.nextCursor}`),
      headers: authHeaders(alice.session.accessToken),
    });
    const secondPage = parseJsonBody<{
      items: Array<{
        body: string | null;
      }>;
      nextCursor: string | null;
    }>(secondPageResponse.body);

    expect(secondPageResponse.statusCode).toBe(200);
    expect(secondPage.items).toHaveLength(5);
    expect(secondPage.items.map((message) => message.body)).toEqual([
      'Message 1',
      'Message 2',
      'Message 3',
      'Message 4',
      'Message 5',
    ]);
    expect(secondPage.nextCursor).toBeNull();
  });

  it('does not skip messages that share the same createdAt when paginating', async () => {
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
      url: apiRoute('/chats/direct'),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        participantEmail: 'bob@example.com',
      },
    });

    expect(chatResponse.statusCode).toBe(200);
    const chat = parseJsonBody<{ id: string }>(chatResponse.body);
    const sharedCreatedAt = new Date('2026-01-01T00:00:00.000Z');

    for (let index = 1; index <= 4; index += 1) {
      await context.prisma.message.create({
        data: {
          chatId: chat.id,
          senderId: alice.session.user.id,
          body: `Same time ${index}`,
          createdAt: sharedCreatedAt,
        },
      });
    }

    const firstPageResponse = await context.app.inject({
      method: 'GET',
      url: apiRoute(`/chats/${chat.id}/messages?limit=2`),
      headers: authHeaders(alice.session.accessToken),
    });
    const firstPage = parseJsonBody<{
      items: Array<{
        id: string;
      }>;
      nextCursor: string | null;
    }>(firstPageResponse.body);

    expect(firstPageResponse.statusCode).toBe(200);
    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.nextCursor).not.toBeNull();

    const secondPageResponse = await context.app.inject({
      method: 'GET',
      url: apiRoute(`/chats/${chat.id}/messages?limit=2&cursor=${firstPage.nextCursor}`),
      headers: authHeaders(alice.session.accessToken),
    });
    const secondPage = parseJsonBody<{
      items: Array<{
        id: string;
      }>;
      nextCursor: string | null;
    }>(secondPageResponse.body);

    expect(secondPageResponse.statusCode).toBe(200);
    expect(secondPage.items).toHaveLength(2);
    expect(secondPage.nextCursor).toBeNull();

    const combinedIds = [...firstPage.items, ...secondPage.items].map((message) => message.id);

    expect(new Set(combinedIds).size).toBe(4);
  });
});
