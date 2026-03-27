export const chatKeys = {
  all: ['chats'] as const,
  messages: (chatId: string) => ['chats', chatId, 'messages'] as const,
};
