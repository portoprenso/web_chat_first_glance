import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MessageComposer } from './message-composer';
import { renderWithProviders } from '../../../test/render';
import { server } from '../../../test/server';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MessageComposer', () => {
  it('sends the message when Enter is pressed on desktop', async () => {
    const createMessageSpy = vi.fn();

    mockMatchMedia(true);
    server.use(
      http.post('http://localhost:3000/api/chats/chat-1/messages', async ({ request }) => {
        createMessageSpy(await request.json());

        return HttpResponse.json(
          {
            id: 'message-2',
            chatId: 'chat-1',
            body: 'Hello from Enter',
            createdAt: new Date().toISOString(),
            sender: {
              id: 'user-1',
              email: 'alice@example.com',
              displayName: 'Alice',
            },
            attachments: [],
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<MessageComposer chatId="chat-1" />);

    const composer = screen.getByPlaceholderText('Write a message…');

    fireEvent.change(composer, { target: { value: 'Hello from Enter' } });
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(createMessageSpy).toHaveBeenCalledWith({
        body: 'Hello from Enter',
        attachmentIds: [],
      }),
    );
    await waitFor(() => expect(composer).toHaveValue(''));
  });

  it('keeps Enter for editing on touch devices', async () => {
    const createMessageSpy = vi.fn();

    mockMatchMedia(false);
    server.use(
      http.post('http://localhost:3000/api/chats/chat-1/messages', async ({ request }) => {
        createMessageSpy(await request.json());

        return HttpResponse.json(
          {
            id: 'message-2',
            chatId: 'chat-1',
            body: 'Hello from mobile',
            createdAt: new Date().toISOString(),
            sender: {
              id: 'user-1',
              email: 'alice@example.com',
              displayName: 'Alice',
            },
            attachments: [],
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<MessageComposer chatId="chat-1" />);

    const composer = screen.getByPlaceholderText('Write a message…');

    fireEvent.change(composer, { target: { value: 'Hello from mobile' } });
    fireEvent.keyDown(composer, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(createMessageSpy).not.toHaveBeenCalled());
    expect(composer).toHaveValue('Hello from mobile');
  });
});
