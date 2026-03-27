import { mkdir, writeFile } from 'node:fs/promises';

import { buildApp } from '../app/build-app.js';
import { createConfig } from '../config/env.js';

const app = await buildApp({
  logger: false,
  config: createConfig({
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/chat_app?schema=public',
    FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
    JWT_ACCESS_SECRET:
      process.env.JWT_ACCESS_SECRET ?? 'development-only-contract-generation-secret-1234',
    SWAGGER_ENABLED: process.env.SWAGGER_ENABLED ?? 'false',
  }),
});

try {
  await app.ready();
  const targetDirectory = new URL('../../generated/', import.meta.url);
  const targetFile = new URL('../../generated/openapi.json', import.meta.url);

  await mkdir(targetDirectory, { recursive: true });
  await writeFile(targetFile, JSON.stringify(app.swagger(), null, 2));
} finally {
  await app.close();
}
