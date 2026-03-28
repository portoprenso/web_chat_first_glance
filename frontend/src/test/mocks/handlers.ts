import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('http://localhost:3000/api/auth/refresh', () =>
    HttpResponse.json(
      {
        accessToken: 'restored-token',
        accessTokenExpiresAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          displayName: 'Alice',
          createdAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    ),
  ),
  http.post('http://localhost:3000/api/auth/login', () =>
    HttpResponse.json(
      {
        accessToken: 'login-token',
        accessTokenExpiresAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          displayName: 'Alice',
          createdAt: new Date().toISOString(),
        },
      },
      { status: 200 },
    ),
  ),
  http.post('http://localhost:3000/api/auth/register', () =>
    HttpResponse.json(
      {
        accessToken: 'register-token',
        accessTokenExpiresAt: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          displayName: 'Alice',
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 },
    ),
  ),
  http.post('http://localhost:3000/api/auth/logout', () =>
    HttpResponse.json(
      {
        success: true,
      },
      { status: 200 },
    ),
  ),
  http.get('http://localhost:3000/api/chats', () =>
    HttpResponse.json(
      {
        items: [
          {
            id: 'chat-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            participant: {
              id: 'user-2',
              email: 'bob@example.com',
              displayName: 'Bob',
            },
            lastMessage: {
              id: 'message-1',
              body: 'Hi there',
              createdAt: new Date().toISOString(),
              senderId: 'user-2',
              attachmentCount: 0,
            },
          },
        ],
      },
      { status: 200 },
    ),
  ),
  http.get('http://localhost:3000/api/chats/chat-1/messages', () =>
    HttpResponse.json(
      {
        items: [
          {
            id: 'message-1',
            chatId: 'chat-1',
            body: 'Hi there',
            createdAt: new Date().toISOString(),
            sender: {
              id: 'user-2',
              email: 'bob@example.com',
              displayName: 'Bob',
            },
            attachments: [],
          },
        ],
        nextCursor: null,
      },
      { status: 200 },
    ),
  ),
];
