import type { Attachment, Chat, ChatParticipant, Message, User } from '@prisma/client';

import { apiRoute } from '../../app/routes.js';

export function toUserDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toMessageSenderDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
  };
}

export function toAttachmentDto(attachment: Attachment) {
  return {
    id: attachment.id,
    originalName: attachment.originalName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
    downloadPath: apiRoute(`/attachments/${attachment.id}/download`),
    createdAt: attachment.createdAt.toISOString(),
  };
}

type MessageRecord = Message & {
  sender: User;
  attachments: Attachment[];
};

export function toMessageDto(message: MessageRecord) {
  return {
    id: message.id,
    chatId: message.chatId,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    sender: toMessageSenderDto(message.sender),
    attachments: message.attachments.map(toAttachmentDto),
  };
}

type ChatSummaryRecord = Chat & {
  participants: Array<ChatParticipant & { user: User }>;
  messages: Array<Message & { attachments: Attachment[] }>;
};

export function toChatSummaryDto(chat: ChatSummaryRecord, currentUserId: string) {
  const participant = chat.participants.find((item) => item.userId !== currentUserId)?.user;

  if (!participant) {
    throw new Error('Direct chat participant not found.');
  }

  const lastMessage = chat.messages[0]
    ? {
        id: chat.messages[0].id,
        body: chat.messages[0].body,
        createdAt: chat.messages[0].createdAt.toISOString(),
        senderId: chat.messages[0].senderId,
        attachmentCount: chat.messages[0].attachments.length,
      }
    : null;

  return {
    id: chat.id,
    createdAt: chat.createdAt.toISOString(),
    updatedAt: chat.updatedAt.toISOString(),
    participant: toMessageSenderDto(participant),
    lastMessage,
  };
}
