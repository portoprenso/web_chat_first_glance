# First Glance Chat

Production-appropriate MVP chat foundation built as one product with two applications:

- `frontend/`: React + TypeScript + Vite client
- `backend/`: Fastify + TypeScript + Prisma + PostgreSQL API

There is no shared workspace package. The backend owns the contracts and synchronizes them into frontend-local generated files.

## Architecture

- REST is namespaced under `/api` for registration, login, refresh, chat creation, chat list, message history, message creation, and attachment upload/download.
- Native WebSocket is exposed at `/api/ws` for authenticated realtime delivery of `chat.created` and `message.created` events.
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
yarn dev:db
yarn dev:backend:init
yarn contracts:sync
yarn dev:backend
yarn dev:frontend
```

Open the app at `http://localhost:5173`. When you access the app directly from the Vite dev server on port `5173`, the frontend talks straight to the backend on the same host at port `3000`, so you do not need `nginx` for the normal local loop. When the frontend sits behind `nginx` in Docker, it falls back to the browser origin and uses the reverse proxy as expected. The `docker compose` database container is optional but handy when you want PostgreSQL without installing it locally, and the backend itself can run directly on your machine with localhost-friendly defaults outside production.

`yarn dev:backend:init` is the local helper for Prisma client generation and migrations against the default localhost database. Run it on first setup and after schema changes.

Backend env overrides are documented in [backend/.env.example](/Users/home/Desktop/web_chat_first_glance/backend/.env.example). Frontend env overrides are optional and documented in [frontend/.env.example](/Users/home/Desktop/web_chat_first_glance/frontend/.env.example).

Docker workflow:

```bash
cp .env.example .env
docker compose up --build
```

This starts PostgreSQL, backend, frontend, and an `nginx` reverse proxy. Open the app at `http://localhost:8080`.

By default Docker now stores persistent local data in host directories instead of Docker-managed named volumes:

- PostgreSQL data: `./.docker-data/postgres`
- Uploaded files: `./.docker-data/storage`

That means the database and uploaded files survive container rebuilds and `docker compose down` as long as those host folders remain in place. If you want the data somewhere else on your machine, update `.env` in the repo root:

```bash
POSTGRES_DATA_DIR=/absolute/path/to/postgres-data
BACKEND_STORAGE_HOST_DIR=/absolute/path/to/upload-storage
```

If you already have local data in the old Docker named volumes, Docker will not move it into the new host folders automatically.

To expose the whole app through one `ngrok` tunnel:

```bash
ngrok http 8080
```

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
