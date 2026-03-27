import type { PrismaClient } from '@prisma/client';

import { AppError } from '../../lib/errors.js';
import { normalizeEmail } from '../../lib/http.js';
import { toChatSummaryDto } from '../../contracts/rest/presenters.js';

type ChatServiceDeps = {
  prisma: PrismaClient;
};

const chatSummaryInclude = {
  participants: {
    include: {
      user: true,
    },
  },
  messages: {
    take: 1,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      attachments: true,
    },
  },
} as const;

export async function ensureChatAccess(deps: ChatServiceDeps, chatId: string, userId: string) {
  const membership = await deps.prisma.chatParticipant.findUnique({
    where: {
      chatId_userId: {
        chatId,
        userId,
      },
    },
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
  });

  if (!membership) {
    throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat was not found.');
  }

  return membership.chat;
}

export async function listChats(deps: ChatServiceDeps, userId: string) {
  const chats = await deps.prisma.chat.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
      },
    },
    include: chatSummaryInclude,
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return {
    items: chats.map((chat) => toChatSummaryDto(chat, userId)),
  };
}

export async function loadChatSummary(deps: ChatServiceDeps, chatId: string, userId: string) {
  const chat = await deps.prisma.chat.findUnique({
    where: { id: chatId },
    include: chatSummaryInclude,
  });

  if (!chat) {
    throw new AppError(404, 'CHAT_NOT_FOUND', 'Chat was not found.');
  }

  return toChatSummaryDto(chat, userId);
}

export async function openDirectChat(
  deps: ChatServiceDeps,
  currentUserId: string,
  participantEmail: string,
): Promise<{
  chat: Awaited<ReturnType<typeof loadChatSummary>>;
  created: boolean;
  participantId: string;
}> {
  const normalizedEmail = normalizeEmail(participantEmail);
  const otherUser = await deps.prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!otherUser) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Recipient account does not exist.');
  }

  if (otherUser.id === currentUserId) {
    throw new AppError(400, 'INVALID_PARTICIPANT', 'Cannot open a chat with yourself.');
  }

  const directChatKey = [currentUserId, otherUser.id].sort().join(':');

  let chat = await deps.prisma.chat.findUnique({
    where: { directChatKey },
  });
  let created = false;

  if (!chat) {
    try {
      chat = await deps.prisma.chat.create({
        data: {
          directChatKey,
          participants: {
            create: [{ userId: currentUserId }, { userId: otherUser.id }],
          },
        },
      });
      created = true;
    } catch {
      chat = await deps.prisma.chat.findUnique({
        where: { directChatKey },
      });
    }
  }

  if (!chat) {
    throw new AppError(500, 'CHAT_CREATE_FAILED', 'Unable to create direct chat.');
  }

  return {
    chat: await loadChatSummary(deps, chat.id, currentUserId),
    created,
    participantId: otherUser.id,
  };
}
