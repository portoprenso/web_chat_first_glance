# Backend

Fastify + TypeScript + Prisma backend for the chat product.

## Main Structure

- `src/app`: app bootstrap and Fastify decorations
- `src/config`: environment parsing
- `src/contracts/rest`: REST schemas and DTO presenters
- `src/contracts/ws`: WebSocket event schemas
- `src/modules/auth`: registration, login, refresh, logout
- `src/modules/chats`: direct chat creation and chat list
- `src/modules/messages`: history pagination and message creation
- `src/modules/attachments`: upload and authenticated download
- `src/storage`: filesystem storage abstraction and local implementation
- `src/websocket`: native WebSocket hub
- `src/test`: Vitest integration tests
- `prisma`: schema, migration, seed

## Auth Model

- Passwords are hashed with `bcryptjs`.
- Access tokens are short-lived JWTs.
- Refresh tokens are opaque random secrets hashed with SHA-256 before persistence.
- Refresh sessions are rotated on every refresh and revoked on logout.
- Private REST routes are namespaced under `/api` and require `Authorization: Bearer <access-token>`.
- WebSocket auth happens on `/api/ws` through a first-frame `auth.authenticate` event carrying the access token.

## Attachment Model

- Upload uses `multipart/form-data` on `POST /api/attachments`.
- Max upload size is configured through `MAX_UPLOAD_BYTES`.
- Files are stored in `STORAGE_DIR`.
- Metadata is persisted in PostgreSQL.
- Downloads are gated through `GET /api/attachments/:attachmentId/download`.
- The `FileStorage` interface isolates the future S3 migration point.

## Runtime Surface

- Swagger UI is served at `/api/docs`.
- Health is served at `/api/health`.
- The Docker workflow puts `nginx` in front of the frontend and backend so the app can be exposed through one public origin.

## Contract Generation

```bash
yarn generate:openapi
yarn generate:ws-types
```

- OpenAPI output: [generated/openapi.json](/Users/home/Desktop/web_chat_first_glance/backend/generated/openapi.json)
- WebSocket schema source: [src/contracts/ws/events.ts](/Users/home/Desktop/web_chat_first_glance/backend/src/contracts/ws/events.ts)

## Commands

```bash
yarn install
yarn prisma:generate
yarn prisma:deploy
yarn dev
yarn lint
yarn typecheck
yarn test
```

## Test Notes

Backend tests expect PostgreSQL to be reachable through `DATABASE_URL`. CI provides this through a service container, and the recommended local path is `docker compose up`.
