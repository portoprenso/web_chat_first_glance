import path from 'node:path';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { ZodTypeAny } from 'zod';

import { createConfig, type AppConfig } from '../config/env.js';
import { createPrismaClient } from '../lib/db.js';
import { isAppError } from '../lib/errors.js';
import { attachmentRoutes } from '../modules/attachments/attachments.routes.js';
import { authRoutes } from '../modules/auth/auth.routes.js';
import { chatRoutes } from '../modules/chats/chats.routes.js';
import { messageRoutes } from '../modules/messages/messages.routes.js';
import { authenticatePlugin } from '../plugins/authenticate.js';
import { LocalFileStorage } from '../storage/local-file-storage.js';
import type { FileStorage } from '../storage/storage.types.js';
import { WebSocketHub } from '../websocket/websocket-hub.js';
import { API_DOCS_ROUTE, API_HEALTH_ROUTE, API_PREFIX, API_WEBSOCKET_ROUTE } from './routes.js';

type BuildAppOptions = {
  config?: AppConfig;
  logger?: boolean | FastifyBaseLogger;
  prisma?: ReturnType<typeof createPrismaClient>;
  storage?: FileStorage;
  websocketHub?: WebSocketHub;
};

function isZodSchema(value: unknown): value is ZodTypeAny {
  return typeof value === 'object' && value !== null && 'safeParse' in value;
}

function toOpenApiSchema(value: unknown): unknown {
  if (isZodSchema(value)) {
    return zodToJsonSchema(value as never, {
      target: 'openApi3',
      $refStrategy: 'none',
    });
  }

  return value;
}

const swaggerSchemaTransform = ({ schema, url }: { schema: unknown; url: string }) => {
  const workingSchema =
    typeof schema === 'object' && schema !== null ? (schema as Record<string, unknown>) : undefined;

  if (!workingSchema) {
    return {
      schema: workingSchema,
      url,
    };
  }

  const { response, headers, querystring, body, params, hide, ...rest } = workingSchema;

  if (hide) {
    return {
      schema: {
        hide: true,
      },
      url,
    };
  }

  const transformed: Record<string, unknown> = {};
  const schemas = { headers, querystring, body, params };

  Object.entries(schemas).forEach(([key, value]) => {
    if (value) {
      transformed[key] = toOpenApiSchema(value);
    }
  });

  if (response && typeof response === 'object') {
    transformed.response = Object.fromEntries(
      Object.entries(response).map(([statusCode, value]) => [statusCode, toOpenApiSchema(value)]),
    );
  }

  Object.entries(rest).forEach(([key, value]) => {
    if (value) {
      transformed[key] = value;
    }
  });

  return {
    schema: transformed,
    url,
  };
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? createConfig();
  const prisma = options.prisma ?? createPrismaClient();
  const storage =
    options.storage ?? new LocalFileStorage(path.resolve(process.cwd(), config.STORAGE_DIR));
  const websocketHub = options.websocketHub ?? new WebSocketHub(config);

  const app = Fastify({
    logger: options.logger ?? true,
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.decorate('config', config);
  app.decorate('prisma', prisma);
  app.decorate('storage', storage);
  app.decorate('websocketHub', websocketHub);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'First Glance Chat API',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: swaggerSchemaTransform as never,
  });

  if (config.SWAGGER_ENABLED) {
    await app.register(swaggerUi, {
      routePrefix: API_DOCS_ROUTE,
    });
  }

  await app.register(cookie);
  await app.register(cors, {
    origin: config.FRONTEND_ORIGIN,
    credentials: true,
  });
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });
  await app.register(rateLimit, {
    global: false,
  });
  await app.register(multipart, {
    attachFieldsToBody: false,
    limits: {
      files: 1,
      fileSize: config.MAX_UPLOAD_BYTES,
    },
  });
  await app.register(websocket);
  await app.register(authenticatePlugin);

  await app.register(authRoutes, { prefix: API_PREFIX });
  await app.register(chatRoutes, { prefix: API_PREFIX });
  await app.register(messageRoutes, { prefix: API_PREFIX });
  await app.register(attachmentRoutes, { prefix: API_PREFIX });

  app.get(API_HEALTH_ROUTE, () => ({ ok: true }));

  app.get(
    API_WEBSOCKET_ROUTE,
    {
      websocket: true,
      schema: {
        hide: true,
      },
    },
    (connection) => {
      websocketHub.attachSocket(connection.socket);
    },
  );

  app.setErrorHandler((error, request, reply) => {
    if ((error as { validation?: unknown }).validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed.',
          details: {
            issues: (error as { validation: unknown }).validation,
          },
          requestId: request.id,
        },
      });
    }

    if (isAppError(error)) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId: request.id,
        },
      });
    }

    request.log.error(error);
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Unexpected server error.',
        requestId: request.id,
      },
    });
  });

  app.addHook('onClose', async (instance) => {
    instance.websocketHub.close();
    await instance.prisma.$disconnect();
  });

  return app;
}
