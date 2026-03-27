import { createBrowserRouter } from 'react-router-dom';

import { ProtectedRoute } from '../components/protected-route';
import { PublicOnlyRoute } from '../components/public-only-route';
import { LoginPage } from '../features/auth/pages/login-page';
import { RegisterPage } from '../features/auth/pages/register-page';
import { ChatPage } from '../features/chats/pages/chat-page';
import { AppShell } from '../components/app-shell';
import { NotFoundPage } from '../pages/not-found-page';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicOnlyRoute>
        <RegisterPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ChatPage />,
      },
      {
        path: 'chats/:chatId',
        element: <ChatPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
