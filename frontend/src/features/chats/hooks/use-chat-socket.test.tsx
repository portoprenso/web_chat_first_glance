import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../../../store/auth-store';
import { chatKeys } from '../query-keys';

let latestOptions:
  | {
      onEvent: (event: {
        type: 'message.created';
        payload: {
          message: {
            id: string;
            chatId: string;
            body: string | null;
            createdAt: string;
            sender: {
              id: string;
              email: string;
              displayName: string;
            };
            attachments: [];
          };
        };
      }) => void;
      url: string;
      connect: () => void;
      disconnect: () => void;
    }
  | undefined;

vi.mock('../../../lib/ws/chat-socket', () => ({
  ChatSocketClient: class {
    constructor(options: { onEvent: (event: never) => void; url: string }) {
      latestOptions = {
        onEvent: options.onEvent as typeof latestOptions extends { onEvent: infer T } ? T : never,
        url: options.url,
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }

    connect() {
      latestOptions?.connect();
    }

    disconnect() {
      latestOptions?.disconnect();
    }
  },
}));

describe('useChatSocket', () => {
  it('applies websocket message events into query cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    queryClient.setQueryData(chatKeys.messages('chat-1'), {
      pageParams: [undefined],
      pages: [
        {
          items: [],
          nextCursor: null,
        },
      ],
    });

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

    const { useChatSocket } = await import('./use-chat-socket');

    function Harness() {
      useChatSocket();
      return null;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <Harness />
      </QueryClientProvider>,
    );

    const expectedSocketUrl = new URL('/api/ws', 'http://localhost:3000');
    expectedSocketUrl.protocol = 'ws:';
    expect(latestOptions?.url).toBe(expectedSocketUrl.toString());

    latestOptions?.onEvent({
      type: 'message.created',
      payload: {
        message: {
          id: 'message-2',
          chatId: 'chat-1',
          body: 'From websocket',
          createdAt: new Date().toISOString(),
          sender: {
            id: 'user-2',
            email: 'bob@example.com',
            displayName: 'Bob',
          },
          attachments: [],
        },
      },
    });

    await waitFor(() => {
      const data = queryClient.getQueryData<{
        pages: Array<{ items: Array<{ body: string | null }> }>;
      }>(chatKeys.messages('chat-1'));

      expect(data?.pages[0]?.items[0]?.body).toBe('From websocket');
    });
  });
});
