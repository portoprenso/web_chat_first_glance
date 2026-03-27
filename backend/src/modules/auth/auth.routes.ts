import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  authCredentialsSchema,
  errorResponseSchema,
  registerBodySchema,
  sessionResponseSchema,
  successResponseSchema,
} from '../../contracts/rest/common.js';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../../lib/cookies.js';
import { loginUser, logoutSession, refreshSession, registerUser } from './auth.service.js';

export const authRoutes: FastifyPluginAsync = (app) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/auth/register',
    {
      schema: {
        tags: ['auth'],
        operationId: 'register',
        body: registerBodySchema,
        response: {
          201: sessionResponseSchema,
          409: errorResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const result = await registerUser(
        {
          prisma: app.prisma,
          config: app.config,
        },
        request.body,
        {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        },
      );

      setRefreshTokenCookie(reply, result.refreshToken, app.config);
      return reply.status(201).send(result.session);
    },
  );

  typed.post(
    '/auth/login',
    {
      schema: {
        tags: ['auth'],
        operationId: 'login',
        body: authCredentialsSchema,
        response: {
          200: sessionResponseSchema,
          401: errorResponseSchema,
        },
      },
      config: {
        rateLimit: {
          max: 10,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const result = await loginUser(
        {
          prisma: app.prisma,
          config: app.config,
        },
        request.body,
        {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        },
      );

      setRefreshTokenCookie(reply, result.refreshToken, app.config);
      return reply.send(result.session);
    },
  );

  typed.post(
    '/auth/refresh',
    {
      schema: {
        tags: ['auth'],
        operationId: 'refreshSession',
        response: {
          200: sessionResponseSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await refreshSession(
        {
          prisma: app.prisma,
          config: app.config,
        },
        request.cookies[app.config.REFRESH_COOKIE_NAME],
        {
          userAgent: request.headers['user-agent'],
          ipAddress: request.ip,
        },
      );

      setRefreshTokenCookie(reply, result.refreshToken, app.config);
      return reply.send(result.session);
    },
  );

  typed.post(
    '/auth/logout',
    {
      schema: {
        tags: ['auth'],
        operationId: 'logout',
        response: {
          200: successResponseSchema,
        },
      },
    },
    async (request, reply) => {
      await logoutSession(
        {
          prisma: app.prisma,
          config: app.config,
        },
        request.cookies[app.config.REFRESH_COOKIE_NAME],
      );

      clearRefreshTokenCookie(reply, app.config);
      return reply.send({ success: true });
    },
  );
  return Promise.resolve();
};
