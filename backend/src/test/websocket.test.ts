import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import {
  authHeaders,
  apiRoute,
  createTestContext,
  parseJsonBody,
  registerUser,
  resetDatabase,
} from './helpers.js';

let context: Awaited<ReturnType<typeof createTestContext>>;

describe('websocket delivery', () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('delivers message.created over native websocket', async () => {
    const alice = await registerUser(context.app, {
      email: 'alice@example.com',
      password: 'password123',
      displayName: 'Alice',
    });
    const bob = await registerUser(context.app, {
      email: 'bob@example.com',
      password: 'password123',
      displayName: 'Bob',
    });

    const chat = await context.app.inject({
      method: 'POST',
      url: apiRoute('/chats/direct'),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        participantEmail: 'bob@example.com',
      },
    });
    const chatPayload = parseJsonBody<{ id: string }>(chat.body);

    await context.app.listen({
      host: '127.0.0.1',
      port: 0,
    });

    const address = context.app.server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to resolve websocket listen address.');
    }

    const eventPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${address.port}${apiRoute('/ws')}`);

      socket.once('open', () => {
        socket.send(
          JSON.stringify({
            type: 'auth.authenticate',
            payload: {
              accessToken: bob.session.accessToken,
            },
          }),
        );
      });

      socket.on('message', (payload) => {
        const raw =
          typeof payload === 'string'
            ? payload
            : Buffer.isBuffer(payload)
              ? payload.toString('utf8')
              : Array.isArray(payload)
                ? Buffer.concat(payload.map((item) => Buffer.from(item))).toString('utf8')
                : Buffer.from(payload).toString('utf8');
        const event = JSON.parse(raw) as { type: string };

        if (event.type === 'message.created') {
          socket.close();
          resolve(event);
        }
      });

      socket.once('error', reject);
    });

    const sendMessage = await context.app.inject({
      method: 'POST',
      url: apiRoute(`/chats/${chatPayload.id}/messages`),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        body: 'Realtime hello',
        attachmentIds: [],
      },
    });

    expect(sendMessage.statusCode).toBe(201);
    const event = await eventPromise;

    expect(event.type).toBe('message.created');
    expect((event.payload as { message: { body: string } }).message.body).toBe('Realtime hello');
  });
});
