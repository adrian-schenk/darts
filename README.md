# Darts

Repository for a full-stack darts app with a Vue 3 frontend and a NestJS backend.

## Features

- Local game: play on one device with turn handling and score tracking.
- Online game: real-time matches over websockets.
- Tournaments: create and run bracketed events.
- Training: focused practice modes and drills.
- Social: friends and dart groups.
- Stats: match and player performance tracking.
- Intuitive user interface

## WIP

- Complete game logic
- Team modes
- Events
- Advanced statistics
- Scheduled tournaments
- Adapative bot tiers

## Stack

- Frontend: Vue 3 (Composition API), Vite, Pinia
- Backend: NestJS, Socket.IO
- Databases: PostgreSQL (TypeORM) and MongoDB (Mongoose)
- Cache: Redis
- Local orchestration: Docker Compose

## Quick start (Docker)

From the repo root:

```bash
docker compose --env-file .env.development up --build
```

App URLs:

- Frontend: http://localhost:5173 (dev users: `admin:admin` and `user:user`)
- Backend: http://localhost:3000

Notes:

- The frontend proxies backend calls to `:3000` in development.
- If you run `docker compose up` without `--env-file .env.development`, Compose warns about missing Postgres env vars.

To stop:

```bash
docker compose down
```

To stop and remove volumes:

```bash
docker compose down -v
```

## Run without Docker

### 1) Start infrastructure

Use Docker for data services only:

```bash
docker compose --env-file .env.development up -d postgres mongodb redis
```

### 2) Start backend

```bash
cd server
npm install
npm run start:dev
```

Backend runs on `http://localhost:3000`.

### 3) Start frontend

In a second terminal:

```bash
cd web
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Useful commands

Backend (`server`):

```bash
npm run test
npm run test:e2e
npm run lint
```

Frontend (`web`):

```bash
npm run test:unit
npm run test:e2e
npm run lint
npm run build
```

## Project layout

```text
.
├── server/   # NestJS API + websocket backend
├── web/      # Vue 3 frontend
├── docker-compose.yml
└── .env.development
```

## Troubleshooting

- Port already in use:
  - Check `3000`, `5173`, `5432`, `27017`, `6379` and stop conflicting services.
- Postgres env warnings in Compose output:
  - Start with `--env-file .env.development`.
- Redis `vm.overcommit_memory` warning:
  - This is a host kernel setting warning from Redis. Development usually still works; set `vm.overcommit_memory=1` on your host if needed.
