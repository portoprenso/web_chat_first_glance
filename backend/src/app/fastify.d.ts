import type { PrismaClient } from '@prisma/client';
import type { FastifyReply } from 'fastify';

import type { AppConfig } from '../config/env.js';
import type { FileStorage } from '../storage/storage.types.js';
import type { WebSocketHub } from '../websocket/websocket-hub.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    prisma: PrismaClient;
    storage: FileStorage;
    websocketHub: WebSocketHub;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user: {
      userId: string;
    } | null;
  }
}

export {};
