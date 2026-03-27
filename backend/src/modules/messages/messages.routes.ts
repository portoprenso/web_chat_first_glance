import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  chatIdParamsSchema,
  createMessageBodySchema,
  errorResponseSchema,
  messageSchema,
  paginatedMessagesSchema,
  messageListQuerySchema,
} from '../../contracts/rest/common.js';
import { createMessage, listMessages } from './messages.service.js';

export const messageRoutes: FastifyPluginAsync = (app) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/chats/:chatId/messages',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['messages'],
        operationId: 'listMessages',
        params: chatIdParamsSchema,
        querystring: messageListQuerySchema,
        response: {
          200: paginatedMessagesSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return listMessages(
        { prisma: app.prisma },
        {
          chatId: request.params.chatId,
          userId: request.user!.userId,
          cursor: request.query.cursor,
          limit: request.query.limit,
        },
      );
    },
  );

  typed.post(
    '/chats/:chatId/messages',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['messages'],
        operationId: 'createMessage',
        params: chatIdParamsSchema,
        body: createMessageBodySchema,
        response: {
          201: messageSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await createMessage(
        { prisma: app.prisma },
        {
          chatId: request.params.chatId,
          userId: request.user!.userId,
          body: request.body.body,
          attachmentIds: request.body.attachmentIds,
        },
      );

      app.websocketHub.broadcastToUsers(result.participantIds, {
        type: 'message.created',
        payload: {
          message: result.message,
        },
      });

      return reply.status(201).send(result.message);
    },
  );
  return Promise.resolve();
};
