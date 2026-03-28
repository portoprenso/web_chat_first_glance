import { config as loadDotEnv } from 'dotenv';
import { z } from 'zod';

loadDotEnv();

const nodeEnvSchema = z.enum(['development', 'test', 'production']);

const envSchema = z.object({
  NODE_ENV: nodeEnvSchema.default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  FRONTEND_ORIGIN: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  REFRESH_COOKIE_NAME: z.string().min(1).default('chat_refresh_token'),
  STORAGE_DIR: z.string().min(1).default('./storage-data'),
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 1024 * 1024),
  SWAGGER_ENABLED: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default('true'),
});

export type AppConfig = z.infer<typeof envSchema> & {
  isProduction: boolean;
};

export function createConfig(input: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = nodeEnvSchema.parse(input.NODE_ENV ?? 'development');
  const isProduction = nodeEnv === 'production';
  const parsed = envSchema.parse({
    ...input,
    NODE_ENV: nodeEnv,
    DATABASE_URL:
      input.DATABASE_URL ??
      (isProduction ? undefined : 'postgresql://postgres:postgres@localhost:5432/chat_app?schema=public'),
    FRONTEND_ORIGIN: input.FRONTEND_ORIGIN ?? (isProduction ? undefined : 'http://localhost:5173'),
    JWT_ACCESS_SECRET:
      input.JWT_ACCESS_SECRET ??
      (isProduction ? undefined : 'development-only-local-jwt-secret-1234'),
  });

  return {
    ...parsed,
    isProduction,
  };
}
