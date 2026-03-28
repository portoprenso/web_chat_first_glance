import type { InfiniteData } from '@tanstack/react-query';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { listChatsRequest, listMessagesRequest, type Message, type MessagePage } from '../api';
import { chatKeys } from '../query-keys';

export function useChatsQuery() {
  return useQuery({
    queryKey: chatKeys.all,
    queryFn: listChatsRequest,
  });
}

export function useChatMessagesQuery(chatId?: string) {
  return useInfiniteQuery({
    queryKey: chatId ? chatKeys.messages(chatId) : ['chats', 'empty', 'messages'],
    initialPageParam: undefined as string | undefined,
    enabled: Boolean(chatId),
    queryFn: ({ pageParam }) => listMessagesRequest(chatId!, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function getOrderedMessages(data: InfiniteData<MessagePage> | undefined): Message[] {
  return data
    ? data.pages
        .slice()
        .reverse()
        .flatMap((page) => page.items)
    : [];
}

export function upsertMessagePageData(
  current: InfiniteData<MessagePage> | undefined,
  message: Message,
): InfiniteData<MessagePage> {
  if (!current) {
    return {
      pageParams: [undefined],
      pages: [{ items: [message], nextCursor: null }],
    };
  }

  const alreadyPresent = current.pages.some((page) =>
    page.items.some((item) => item.id === message.id),
  );

  if (alreadyPresent) {
    return current;
  }

  const [firstPage, ...remainingPages] = current.pages;

  return {
    ...current,
    pages: firstPage
      ? [
          {
            ...firstPage,
            items: [...firstPage.items, message],
          },
          ...remainingPages,
        ]
      : [{ items: [message], nextCursor: null }],
  };
}
