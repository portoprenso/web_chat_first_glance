import { z } from 'zod';

export const isoDateSchema = z.string().datetime();

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1),
  createdAt: isoDateSchema,
});

export const attachmentSchema = z.object({
  id: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  downloadPath: z.string(),
  createdAt: isoDateSchema,
});

export const messageSenderSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string().min(1),
});

export const messageSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  body: z.string().nullable(),
  createdAt: isoDateSchema,
  sender: messageSenderSchema,
  attachments: z.array(attachmentSchema),
});

export const chatPreviewSchema = z.object({
  id: z.string(),
  body: z.string().nullable(),
  createdAt: isoDateSchema,
  senderId: z.string(),
  attachmentCount: z.number().int().nonnegative(),
});

export const chatSummarySchema = z.object({
  id: z.string(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
  participant: messageSenderSchema,
  lastMessage: chatPreviewSchema.nullable(),
});

export const chatListSchema = z.object({
  items: z.array(chatSummarySchema),
});

export const paginatedMessagesSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: z.string().nullable(),
});

export const sessionResponseSchema = z.object({
  accessToken: z.string(),
  accessTokenExpiresAt: isoDateSchema,
  user: userSchema,
});

export const successResponseSchema = z.object({
  success: z.literal(true),
});

export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    requestId: z.string(),
  }),
});

export const authCredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const registerBodySchema = authCredentialsSchema.extend({
  displayName: z.string().trim().min(2).max(50),
});

export const openDirectChatBodySchema = z.object({
  participantEmail: z.string().email(),
});

export const chatIdParamsSchema = z.object({
  chatId: z.string().min(1),
});

export const messageListQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const createMessageBodySchema = z
  .object({
    body: z.string().trim().max(2000).optional(),
    attachmentIds: z.array(z.string()).max(5).default([]),
  })
  .refine((value) => Boolean(value.body) || value.attachmentIds.length > 0, {
    message: 'Message must include text or at least one attachment.',
    path: ['body'],
  });

export const attachmentParamsSchema = z.object({
  attachmentId: z.string().min(1),
});
