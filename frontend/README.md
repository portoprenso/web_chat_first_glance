# Frontend

React + TypeScript + Vite client for the chat product.

## Main Structure

- `src/app`: providers, router, query client
- `src/components`: shared UI shells and route guards
- `src/features/auth`: auth forms, schemas, API calls
- `src/features/chats`: chat UI, hooks, typed API calls, realtime integration
- `src/generated`: backend-generated REST and WebSocket contract artifacts
- `src/lib`: API client, config, formatting, websocket client
- `src/store`: Zustand auth and socket state
- `src/test`: Vitest, Testing Library, MSW helpers

## Auth Strategy

- Access token and user session are held in Zustand memory state.
- On boot, the app calls `/api/auth/refresh` using `credentials: 'include'`.
- On success, the backend rotates the refresh token cookie and returns a new access token.
- Protected routes block until bootstrap finishes.

## Realtime Strategy

- `ChatSocketClient` connects to `/api/ws`.
- On open, it sends the current access token in an `auth.authenticate` event.
- `message.created` appends into the relevant TanStack Query cache with message-id dedupe.
- `chat.created` and `message.created` invalidate the chat list.
- If the socket is rejected with token expiry, the client runs the refresh flow and reconnects.

## Runtime Config

- In tests, the client talks directly to `http://localhost:3000` and `ws://localhost:3000/api/ws`.
- In Vite dev mode, if the app is opened directly from port `5173`, the client talks to the same host on port `3000`.
- In production-style runs, the client uses the current browser origin for HTTP requests and `ws://<current-host>/api/ws` or `wss://<current-host>/api/ws` for realtime.
- `VITE_API_URL` and `VITE_WS_URL` are optional overrides.
- The Vite dev server still proxies `/api` and `/api/ws` to `http://localhost:3000`, and Docker + `nginx` can keep the browser on same-origin requests without extra frontend overrides.

## Commands

```bash
yarn install
yarn generate:api-types
yarn dev
yarn lint
yarn typecheck
yarn test
```

## Tests

- Login form validation
- Protected route redirect behavior
- Chat page rendering from mocked API history
- Query cache updates from mocked WebSocket events
