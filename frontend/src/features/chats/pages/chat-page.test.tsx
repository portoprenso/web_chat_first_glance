import { Route, Routes } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChatPage } from './chat-page';
import { renderWithProviders } from '../../../test/render';
import { useAuthStore } from '../../../store/auth-store';

describe('ChatPage', () => {
  it('renders message history from the API', async () => {
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

    renderWithProviders(
      <Routes>
        <Route element={<ChatPage />} path="/chats/:chatId" />
      </Routes>,
      {
        initialEntries: ['/chats/chat-1'],
      },
    );

    expect(await screen.findAllByText('Bob')).toHaveLength(2);
    expect(await screen.findByText('Hi there')).toBeInTheDocument();
  });
});
