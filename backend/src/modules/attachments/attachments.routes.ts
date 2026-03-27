import type { FastifyPluginAsync } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import {
  attachmentParamsSchema,
  attachmentSchema,
  errorResponseSchema,
} from '../../contracts/rest/common.js';
import { AppError } from '../../lib/errors.js';
import { getAttachmentDownload, uploadAttachment } from './attachments.service.js';

const uploadAttachmentBodySchema = {
  type: 'object',
  required: ['file'],
  properties: {
    file: {
      type: 'string',
      format: 'binary',
    },
  },
} as const;

export const attachmentRoutes: FastifyPluginAsync = (app) => {
  const typed = app.withTypeProvider<ZodTypeProvider>();

  typed.post(
    '/attachments',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attachments'],
        operationId: 'uploadAttachment',
        consumes: ['multipart/form-data'],
        body: uploadAttachmentBodySchema,
        response: {
          201: attachmentSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const file = await request.file();

      if (!file) {
        throw new AppError(400, 'FILE_REQUIRED', 'Attachment file is required.');
      }

      const attachment = await uploadAttachment(
        {
          prisma: app.prisma,
          storage: app.storage,
        },
        {
          file,
          userId: request.user!.userId,
        },
      );

      return reply.status(201).send(attachment);
    },
  );

  typed.get(
    '/attachments/:attachmentId/download',
    {
      onRequest: [app.authenticate],
      schema: {
        tags: ['attachments'],
        operationId: 'downloadAttachment',
        params: attachmentParamsSchema,
        response: {
          403: errorResponseSchema,
          404: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const result = await getAttachmentDownload(
        {
          prisma: app.prisma,
          storage: app.storage,
        },
        {
          attachmentId: request.params.attachmentId,
          userId: request.user!.userId,
        },
      );

      reply.header('Content-Type', result.contentType);
      reply.header(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(result.fileName)}"`,
      );

      return reply.send(result.stream as never);
    },
  );
  return Promise.resolve();
};
