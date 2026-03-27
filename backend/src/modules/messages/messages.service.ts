import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../lib/errors.js';
import { toMessageDto } from '../../contracts/rest/presenters.js';
import { ensureChatAccess } from '../chats/chats.service.js';

type MessageServiceDeps = {
  prisma: PrismaClient;
};

export async function listMessages(
  deps: MessageServiceDeps,
  input: {
    chatId: string;
    userId: string;
    cursor?: string;
    limit: number;
  },
) {
  await ensureChatAccess({ prisma: deps.prisma }, input.chatId, input.userId);

  let cursorMessageCreatedAt: Date | undefined;

  if (input.cursor) {
    const cursorMessage = await deps.prisma.message.findUnique({
      where: { id: input.cursor },
      select: { chatId: true, createdAt: true },
    });

    if (!cursorMessage || cursorMessage.chatId !== input.chatId) {
      throw new AppError(400, 'INVALID_CURSOR', 'Message cursor is invalid for this chat.');
    }

    cursorMessageCreatedAt = cursorMessage.createdAt;
  }

  const messages = await deps.prisma.message.findMany({
    where: {
      chatId: input.chatId,
      ...(cursorMessageCreatedAt
        ? {
            createdAt: {
              lt: cursorMessageCreatedAt,
            },
          }
        : {}),
    },
    include: {
      sender: true,
      attachments: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: input.limit + 1,
  });

  const hasMore = messages.length > input.limit;
  const slice = hasMore ? messages.slice(0, input.limit) : messages;

  return {
    items: slice.reverse().map(toMessageDto),
    nextCursor: hasMore ? (slice[slice.length - 1]?.id ?? null) : null,
  };
}

export async function createMessage(
  deps: MessageServiceDeps,
  input: {
    attachmentIds: string[];
    body?: string;
    chatId: string;
    userId: string;
  },
) {
  const chat = await ensureChatAccess({ prisma: deps.prisma }, input.chatId, input.userId);
  const trimmedBody = input.body?.trim() || null;

  if (!trimmedBody && input.attachmentIds.length === 0) {
    throw new AppError(400, 'EMPTY_MESSAGE', 'Message must include text or attachments.');
  }

  const message = await deps.prisma.$transaction(async (tx) => {
    const attachments =
      input.attachmentIds.length > 0
        ? await tx.attachment.findMany({
            where: {
              id: {
                in: input.attachmentIds,
              },
              uploadedById: input.userId,
              messageId: null,
            },
          })
        : [];

    if (attachments.length !== input.attachmentIds.length) {
      throw new AppError(
        400,
        'INVALID_ATTACHMENTS',
        'One or more attachments are invalid for this message.',
      );
    }

    const created = await tx.message.create({
      data: {
        chatId: input.chatId,
        senderId: input.userId,
        body: trimmedBody,
      },
    });

    if (attachments.length > 0) {
      await tx.attachment.updateMany({
        where: {
          id: {
            in: attachments.map((attachment) => attachment.id),
          },
        },
        data: {
          messageId: created.id,
        },
      });
    }

    await tx.chat.update({
      where: { id: input.chatId },
      data: {
        updatedAt: new Date(),
      },
    });

    return tx.message.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        sender: true,
        attachments: true,
      },
    });
  });

  return {
    participantIds: chat.participants.map((participant) => participant.userId),
    message: toMessageDto(message),
  };
}
