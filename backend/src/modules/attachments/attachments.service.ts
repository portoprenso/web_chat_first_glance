import type { PrismaClient } from '@prisma/client';
import type { MultipartFile } from '@fastify/multipart';

import type { FileStorage } from '../../storage/storage.types.js';
import { AppError } from '../../lib/errors.js';
import { toAttachmentDto } from '../../contracts/rest/presenters.js';

type AttachmentServiceDeps = {
  prisma: PrismaClient;
  storage: FileStorage;
};

export async function uploadAttachment(
  deps: AttachmentServiceDeps,
  input: {
    file: MultipartFile;
    userId: string;
  },
) {
  const stored = await deps.storage.save({
    stream: input.file.file,
    originalName: input.file.filename,
    contentType: input.file.mimetype,
  });

  if (input.file.file.truncated) {
    await deps.storage.remove(stored.storageKey);
    throw new AppError(400, 'FILE_TOO_LARGE', 'Attachment exceeds the configured file size limit.');
  }

  const attachment = await deps.prisma.attachment.create({
    data: {
      uploadedById: input.userId,
      storageKey: stored.storageKey,
      originalName: stored.originalName,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    },
  });

  return toAttachmentDto(attachment);
}

export async function getAttachmentDownload(
  deps: AttachmentServiceDeps,
  input: {
    attachmentId: string;
    userId: string;
  },
) {
  const attachment = await deps.prisma.attachment.findUnique({
    where: { id: input.attachmentId },
    include: {
      message: {
        include: {
          chat: {
            include: {
              participants: {
                select: {
                  userId: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!attachment) {
    throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'Attachment was not found.');
  }

  const userCanAccess =
    attachment.uploadedById === input.userId ||
    attachment.message?.chat.participants.some(
      (participant) => participant.userId === input.userId,
    ) === true;

  if (!userCanAccess) {
    throw new AppError(403, 'FORBIDDEN', 'Attachment is not available for this user.');
  }

  return deps.storage.read(attachment.storageKey, attachment.originalName, attachment.mimeType);
}
