import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import { act } from 'react';
import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { ChatPage } from './chat-page';
import type { Message, MessagePage } from '../api';
import { upsertMessagePageData } from '../hooks/use-chat-data';
import { chatKeys } from '../query-keys';
import { renderWithProviders } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';

const originalScrollHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollHeight',
);
const originalClientHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientHeight',
);
const originalScrollTopDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');

function restoreProperty(
  propertyName: 'scrollHeight' | 'clientHeight' | 'scrollTop',
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(HTMLElement.prototype, propertyName, descriptor);
    return;
  }

  delete HTMLElement.prototype[propertyName];
}

function installScrollMetrics() {
  let scrollHeight = 900;
  let clientHeight = 300;
  let scrollTop = 0;

  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
    configurable: true,
    get() {
      return scrollHeight;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return clientHeight;
    },
  });

  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    configurable: true,
    get() {
      return scrollTop;
    },
    set(value: number) {
      scrollTop = value;
    },
  });

  return {
    getScrollTop: () => scrollTop,
    setMetrics: (
      next: Partial<{
        scrollHeight: number;
        clientHeight: number;
        scrollTop: number;
      }>,
    ) => {
      if (next.scrollHeight !== undefined) {
        scrollHeight = next.scrollHeight;
      }

      if (next.clientHeight !== undefined) {
        clientHeight = next.clientHeight;
      }

      if (next.scrollTop !== undefined) {
        scrollTop = next.scrollTop;
      }
    },
    restore: () => {
      restoreProperty('scrollHeight', originalScrollHeightDescriptor);
      restoreProperty('clientHeight', originalClientHeightDescriptor);
      restoreProperty('scrollTop', originalScrollTopDescriptor);
    },
  };
}

function authenticateUser() {
  useAuthStore.getState().setAuthenticated({
    accessToken: 'token',
    accessTokenExpiresAt: new Date().toISOString(),
    user: {
      id: 'user-1',
      email: 'alice@example.com',
      displayName: 'Alice',
      createdAt: new Date().toISOString(),
    },
  });
}

function createMessage({
  body,
  id,
  senderDisplayName,
  senderEmail,
  senderId,
}: {
  body: string;
  id: string;
  senderDisplayName: string;
  senderEmail: string;
  senderId: string;
}): Message {
  return {
    id,
    chatId: 'chat-1',
    body,
    createdAt: new Date().toISOString(),
    sender: {
      id: senderId,
      email: senderEmail,
      displayName: senderDisplayName,
    },
    attachments: [],
  };
}

function appendMessage(queryClient: QueryClient, message: Message) {
  act(() => {
    queryClient.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages('chat-1'), (current) =>
      upsertMessagePageData(current, message),
    );
  });
}

function appendOlderPage(
  queryClient: QueryClient,
  items: MessagePage['items'],
  nextCursor: string | null = null,
) {
  act(() => {
    queryClient.setQueryData<InfiniteData<MessagePage>>(chatKeys.messages('chat-1'), (current) => {
      if (!current) {
        return current;
      }

      return {
        pageParams: [...current.pageParams, 'older-cursor'],
        pages: [...current.pages, { items, nextCursor }],
      };
    });
  });
}

function renderChatPage() {
  return renderWithProviders(
    <Routes>
      <Route element={<ChatPage />} path="/chats/:chatId" />
    </Routes>,
    {
      initialEntries: ['/chats/chat-1'],
    },
  );
}

describe('ChatPage', () => {
  let scrollMetrics: ReturnType<typeof installScrollMetrics>;

  beforeEach(() => {
    scrollMetrics = installScrollMetrics();
    authenticateUser();
  });

  afterEach(() => {
    scrollMetrics.restore();
  });

  it('renders message history from the API and opens at the latest message', async () => {
    renderChatPage();

    expect(await screen.findAllByText('Bob')).toHaveLength(2);
    expect(await screen.findByText('Hi there')).toBeInTheDocument();
    expect(await screen.findByLabelText('Message history')).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollMetrics.getScrollTop()).toBe(900);
    });
  });

  it('auto-scrolls to the newest incoming message when already near the bottom', async () => {
    const { queryClient } = renderChatPage();

    await screen.findByText('Hi there');

    scrollMetrics.setMetrics({ scrollHeight: 1200 });
    appendMessage(
      queryClient,
      createMessage({
        body: 'Latest from Bob',
        id: 'message-2',
        senderDisplayName: 'Bob',
        senderEmail: 'bob@example.com',
        senderId: 'user-2',
      }),
    );

    expect(await screen.findByText('Latest from Bob')).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollMetrics.getScrollTop()).toBe(1200);
    });
  });

  it('keeps the current position for incoming messages while reading older history', async () => {
    const { queryClient } = renderChatPage();
    const messageHistory = await screen.findByLabelText('Message history');

    await screen.findByText('Hi there');

    scrollMetrics.setMetrics({ scrollTop: 100 });
    fireEvent.scroll(messageHistory);

    scrollMetrics.setMetrics({ scrollHeight: 1200, scrollTop: 100 });
    appendMessage(
      queryClient,
      createMessage({
        body: 'Do not interrupt reading',
        id: 'message-2',
        senderDisplayName: 'Bob',
        senderEmail: 'bob@example.com',
        senderId: 'user-2',
      }),
    );

    expect(await screen.findByText('Do not interrupt reading')).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollMetrics.getScrollTop()).toBe(100);
    });
  });

  it('jumps back to the bottom for the current user outgoing message', async () => {
    const { queryClient } = renderChatPage();
    const messageHistory = await screen.findByLabelText('Message history');

    await screen.findByText('Hi there');

    scrollMetrics.setMetrics({ scrollTop: 100 });
    fireEvent.scroll(messageHistory);

    scrollMetrics.setMetrics({ scrollHeight: 1200, scrollTop: 100 });
    appendMessage(
      queryClient,
      createMessage({
        body: 'My reply from history view',
        id: 'message-2',
        senderDisplayName: 'Alice',
        senderEmail: 'alice@example.com',
        senderId: 'user-1',
      }),
    );

    expect(await screen.findByText('My reply from history view')).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollMetrics.getScrollTop()).toBe(1200);
    });
  });

  it('does not jump to the bottom when older history is loaded', async () => {
    const { queryClient } = renderChatPage();
    const messageHistory = await screen.findByLabelText('Message history');

    await screen.findByText('Hi there');

    scrollMetrics.setMetrics({ scrollTop: 40 });
    fireEvent.scroll(messageHistory);

    scrollMetrics.setMetrics({ scrollHeight: 1400, scrollTop: 40 });
    appendOlderPage(queryClient, [
      {
        id: 'message-0',
        chatId: 'chat-1',
        body: 'An older message',
        createdAt: new Date(Date.now() - 60_000).toISOString(),
        sender: {
          id: 'user-2',
          email: 'bob@example.com',
          displayName: 'Bob',
        },
        attachments: [],
      },
    ]);

    expect(await screen.findByText('An older message')).toBeInTheDocument();

    await waitFor(() => {
      expect(scrollMetrics.getScrollTop()).toBe(40);
    });
  });
});
