import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  authHeaders,
  apiRoute,
  buildMultipartBody,
  createTestContext,
  parseJsonBody,
  registerUser,
  resetDatabase,
} from './helpers.js';

let context: Awaited<ReturnType<typeof createTestContext>>;

describe('attachment flows', () => {
  beforeAll(async () => {
    context = await createTestContext();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.cleanup();
  });

  it('uploads an attachment, links it to a message, and downloads it', async () => {
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

    const chat = await context.app.inject({
      method: 'POST',
      url: apiRoute('/chats/direct'),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        participantEmail: 'bob@example.com',
      },
    });

    const multipart = buildMultipartBody('note.txt', 'attachment payload');
    const uploadResponse = await context.app.inject({
      method: 'POST',
      url: apiRoute('/attachments'),
      headers: {
        ...authHeaders(alice.session.accessToken),
        'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.payload,
    });

    expect(uploadResponse.statusCode).toBe(201);
    const attachment = parseJsonBody<{ downloadPath: string; id: string }>(uploadResponse.body);
    const chatPayload = parseJsonBody<{ id: string }>(chat.body);
    expect(attachment.downloadPath).toBe(apiRoute(`/attachments/${attachment.id}/download`));

    const messageResponse = await context.app.inject({
      method: 'POST',
      url: apiRoute(`/chats/${chatPayload.id}/messages`),
      headers: authHeaders(alice.session.accessToken),
      payload: {
        attachmentIds: [attachment.id],
      },
    });
    const createdMessage = parseJsonBody<{
      attachments: Array<{
        id: string;
      }>;
    }>(messageResponse.body);

    expect(messageResponse.statusCode).toBe(201);
    expect(createdMessage.attachments).toHaveLength(1);

    const downloadResponse = await context.app.inject({
      method: 'GET',
      url: attachment.downloadPath,
      headers: authHeaders(alice.session.accessToken),
    });

    expect(downloadResponse.statusCode).toBe(200);
    expect(downloadResponse.body).toContain('attachment payload');
  });
});
