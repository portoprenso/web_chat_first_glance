import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  chatListSchema,
  chatSummarySchema,
  errorResponseSchema,
  openDirectChatBodySchema,
} from '../../contracts/rest/common.js';
import { openDirectChat, listChats } from './chats.service.js';

export const chatRoutes: FastifyPluginAsync = (app) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.get(
    '/chats',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['chats'],
        operationId: 'listChats',
        response: {
          200: chatListSchema,
          401: errorResponseSchema,
        },
      },
    },
    async (request) => {
      return listChats({ prisma: app.prisma }, request.user!.userId);
    },
  );

  typed.post(
    '/chats/direct',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['chats'],
        operationId: 'openDirectChat',
        body: openDirectChatBodySchema,
        response: {
          200: chatSummarySchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request) => {
      const result = await openDirectChat(
        { prisma: app.prisma },
        request.user!.userId,
        request.body.participantEmail,
      );

      if (result.created) {
        app.websocketHub.broadcastToUsers([result.participantId], {
          type: 'chat.created',
          payload: {
            chat: result.chat,
          },
        });
      }

      return result.chat;
    },
  );
  return Promise.resolve();
};
