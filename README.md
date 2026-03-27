# First Glance Chat

Production-appropriate MVP chat foundation built as one product with two applications:

- `frontend/`: React + TypeScript + Vite client
- `backend/`: Fastify + TypeScript + Prisma + PostgreSQL API

There is no shared workspace package. The backend owns the contracts and synchronizes them into frontend-local generated files.

## Architecture

- REST is the source of truth for registration, login, refresh, chat creation, chat list, message history, message creation, and attachment upload/download.
- Native WebSocket is used for authenticated realtime delivery of `chat.created` and `message.created` events.
- Access tokens are short-lived JWTs stored only in frontend memory.
- Refresh tokens are opaque, persisted in PostgreSQL, rotated on refresh, and transported through an HTTP-only cookie.
- Attachments are stored on the local filesystem behind a storage abstraction so S3-compatible storage can replace it later.

## Contract Synchronization

- Backend REST schemas live in [backend/src/contracts/rest/common.ts](/Users/home/Desktop/web_chat_first_glance/backend/src/contracts/rest/common.ts).
- Backend WebSocket schemas live in [backend/src/contracts/ws/events.ts](/Users/home/Desktop/web_chat_first_glance/backend/src/contracts/ws/events.ts).
- Backend emits OpenAPI to [backend/generated/openapi.json](/Users/home/Desktop/web_chat_first_glance/backend/generated/openapi.json).
- Frontend regenerates REST types into [frontend/src/generated/api-types.ts](/Users/home/Desktop/web_chat_first_glance/frontend/src/generated/api-types.ts).
- Backend regenerates WebSocket types into [frontend/src/generated/ws-contracts.ts](/Users/home/Desktop/web_chat_first_glance/frontend/src/generated/ws-contracts.ts).

Commands:

```bash
yarn install
yarn --cwd backend install
yarn --cwd frontend install
yarn contracts:sync
yarn contracts:check
```

CI runs `yarn contracts:check` and fails if generated artifacts drift from backend-owned schemas.

## Local Development

Local host workflow:

```bash
yarn install
yarn --cwd backend install
yarn --cwd frontend install
yarn --cwd backend prisma:generate
yarn --cwd backend prisma:deploy
yarn contracts:sync
yarn --cwd backend dev
yarn --cwd frontend dev
```

Required backend env values are in [backend/.env.example](/Users/home/Desktop/web_chat_first_glance/backend/.env.example). Frontend env values are in [frontend/.env.example](/Users/home/Desktop/web_chat_first_glance/frontend/.env.example).

Docker workflow:

```bash
docker compose up --build
```

This starts PostgreSQL, backend, and frontend. Uploaded files persist in the `backend_storage` volume.

## Verification

Commands:

```bash
yarn lint
yarn typecheck
yarn --cwd frontend test
yarn --cwd backend test
```

What I verified in this environment:

- `yarn contracts:sync`
- `yarn lint`
- `yarn typecheck`
- `yarn --cwd frontend test`

Backend tests are implemented and wired for PostgreSQL, but they were not runnable here because Docker/PostgreSQL is unavailable in this sandbox.

## Repo Guide

- Frontend details: [frontend/README.md](/Users/home/Desktop/web_chat_first_glance/frontend/README.md)
- Backend details: [backend/README.md](/Users/home/Desktop/web_chat_first_glance/backend/README.md)
