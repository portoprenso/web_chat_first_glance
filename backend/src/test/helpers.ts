import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';

import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';

import { buildApp } from '../app/build-app.js';
import { AUTH_COOKIE_PATH, apiRoute } from '../app/routes.js';
import { createConfig } from '../config/env.js';
import { createPrismaClient } from '../lib/db.js';
import { LocalFileStorage } from '../storage/local-file-storage.js';

type Session = {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: {
    createdAt: string;
    displayName: string;
    email: string;
    id: string;
  };
};

type SessionResult = {
  cookie: string;
  session: Session;
  setCookieHeader: string;
};

function getSetCookieHeader(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.join('; ') : value ?? '';
}

export async function createTestContext(): Promise<{
  app: FastifyInstance;
  prisma: PrismaClient;
  cleanup: () => Promise<void>;
  storageDirectory: string;
}> {
  process.env.NODE_ENV = 'test';
  process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/chat_app?schema=public';
  process.env.JWT_ACCESS_SECRET =
    process.env.JWT_ACCESS_SECRET ?? 'test-only-secret-value-for-chat-backend-1234';

  const storageDirectory = await mkdtemp(path.join(os.tmpdir(), 'chat-backend-test-'));
  const prisma = createPrismaClient();
  const app = await buildApp({
    logger: false,
    prisma,
    storage: new LocalFileStorage(storageDirectory),
    config: createConfig({
      ...process.env,
      NODE_ENV: 'test',
      FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/chat_app?schema=public',
      JWT_ACCESS_SECRET:
        process.env.JWT_ACCESS_SECRET ?? 'test-only-secret-value-for-chat-backend-1234',
      SWAGGER_ENABLED: 'false',
    }),
  });

  await app.ready();

  return {
    app,
    prisma,
    storageDirectory,
    cleanup: async () => {
      await app.close();
      await rm(storageDirectory, { recursive: true, force: true });
    },
  };
}

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Attachment", "Message", "ChatParticipant", "Chat", "RefreshSession", "User" RESTART IDENTITY CASCADE;',
  );
}

export async function registerUser(
  app: FastifyInstance,
  input: {
    displayName: string;
    email: string;
    password: string;
  },
): Promise<SessionResult> {
  const response = await app.inject({
    method: 'POST',
    url: apiRoute('/auth/register'),
    payload: input,
  });

  const cookies = response.cookies;

  if (response.statusCode !== 201 || cookies.length === 0) {
    throw new Error(`Register failed: ${response.body}`);
  }

  const cookie = cookies[0];

  if (!cookie) {
    throw new Error('Register cookie missing.');
  }

  return {
    cookie: `${cookie.name}=${cookie.value}`,
    session: response.json(),
    setCookieHeader: getSetCookieHeader(response.headers['set-cookie']),
  };
}

export async function loginUser(
  app: FastifyInstance,
  input: {
    email: string;
    password: string;
  },
): Promise<SessionResult> {
  const response = await app.inject({
    method: 'POST',
    url: apiRoute('/auth/login'),
    payload: input,
  });

  const cookies = response.cookies;

  if (response.statusCode !== 200 || cookies.length === 0) {
    throw new Error(`Login failed: ${response.body}`);
  }

  const cookie = cookies[0];

  if (!cookie) {
    throw new Error('Login cookie missing.');
  }

  return {
    cookie: `${cookie.name}=${cookie.value}`,
    session: response.json(),
    setCookieHeader: getSetCookieHeader(response.headers['set-cookie']),
  };
}

export function authHeaders(accessToken: string, cookie?: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    ...(cookie ? { cookie } : {}),
  };
}

export function buildMultipartBody(fileName: string, content: string) {
  const boundary = '----ChatTestBoundary';
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

export function parseJsonBody<T>(body: string): T {
  return JSON.parse(body) as T;
}

export { AUTH_COOKIE_PATH, apiRoute };
