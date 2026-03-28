import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../app/build-app.js';
import { apiRoute } from '../app/routes.js';
import { createConfig } from '../config/env.js';
import { signAccessToken } from '../lib/jwt.js';
import type { FileStorage } from '../storage/storage.types.js';

function buildMultipartBody(fileName: string, content: string) {
  const boundary = '----AttachmentRouteBoundary';
  const payload = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${fileName}"`,
    'Content-Type: text/plain',
    '',
    content,
    `--${boundary}--`,
    '',
  ].join('\r\n');

  return {
    boundary,
    payload,
  };
}

const config = createConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/chat_app?schema=public',
  FRONTEND_ORIGIN: 'http://localhost:5173',
  JWT_ACCESS_SECRET: 'test-only-secret-value-for-attachment-route-1234',
  SWAGGER_ENABLED: 'false',
});

const prisma = {
  attachment: {
    create: async ({
      data,
    }: {
      data: {
        mimeType: string;
        originalName: string;
        sizeBytes: number;
        storageKey: string;
        uploadedById: string;
      };
    }) => ({
      id: 'attachment-1',
      createdAt: new Date('2026-03-28T00:00:00.000Z'),
      ...data,
    }),
  },
  $disconnect: async () => {},
} as never;

const storage: FileStorage = {
  save: async (input) => ({
    storageKey: 'stored-file',
    originalName: input.originalName,
    mimeType: input.contentType ?? 'application/octet-stream',
    sizeBytes: 18,
  }),
  read: async () => {
    throw new Error('not implemented');
  },
  remove: async () => {},
};

const app = await buildApp({
  logger: false,
  config,
  prisma,
  storage,
});

afterAll(async () => {
  await app.close();
});

describe('attachment route', () => {
  it('accepts multipart uploads with the Zod validator compiler enabled', async () => {
    const token = signAccessToken('user-1', config).token;
    const multipart = buildMultipartBody('note.txt', 'attachment payload');

    const response = await app.inject({
      method: 'POST',
      url: apiRoute('/attachments'),
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': `multipart/form-data; boundary=${multipart.boundary}`,
      },
      payload: multipart.payload,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      id: 'attachment-1',
      originalName: 'note.txt',
      mimeType: 'text/plain',
      sizeBytes: 18,
      downloadPath: apiRoute('/attachments/attachment-1/download'),
    });
  });

  it('keeps the multipart file schema in the generated OpenAPI document', () => {
    const spec = app.swagger();
    const uploadPath = (spec.paths?.['/api/attachments'] ?? {}) as {
      post?: {
        requestBody?: {
          content?: {
            'multipart/form-data'?: {
              schema?: {
                properties?: Record<string, { format?: string; type?: string }>;
                required?: string[];
                type?: string;
              };
            };
          };
        };
      };
    };
    const requestSchema = uploadPath.post?.requestBody?.content?.['multipart/form-data']?.schema;

    expect(requestSchema).toMatchObject({
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    });
  });
});
