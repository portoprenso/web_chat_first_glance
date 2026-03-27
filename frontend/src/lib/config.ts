import { z } from 'zod';

const configSchema = z.object({
  VITE_API_URL: z.string().url().default('http://localhost:3000'),
  VITE_WS_URL: z.string().url().default('ws://localhost:3000/ws'),
});

export const appConfig = configSchema.parse(import.meta.env);
