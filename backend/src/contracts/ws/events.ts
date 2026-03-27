import { z } from 'zod';

import { chatSummarySchema, messageSchema } from '../rest/common.js';

export const clientEventSchemas = {
  'auth.authenticate': z.object({
    type: z.literal('auth.authenticate'),
    payload: z.object({
      accessToken: z.string().min(1),
    }),
  }),
} as const;

export const serverEventSchemas = {
  'connection.ready': z.object({
    type: z.literal('connection.ready'),
    payload: z.object({
      userId: z.string(),
    }),
  }),
  'chat.created': z.object({
    type: z.literal('chat.created'),
    payload: z.object({
      chat: chatSummarySchema,
    }),
  }),
  'message.created': z.object({
    type: z.literal('message.created'),
    payload: z.object({
      message: messageSchema,
    }),
  }),
  error: z.object({
    type: z.literal('error'),
    payload: z.object({
      code: z.string(),
      message: z.string(),
    }),
  }),
} as const;

export const clientEventSchema = clientEventSchemas['auth.authenticate'];

export const serverEventSchema = z.union([
  serverEventSchemas['connection.ready'],
  serverEventSchemas['chat.created'],
  serverEventSchemas['message.created'],
  serverEventSchemas.error,
]);
