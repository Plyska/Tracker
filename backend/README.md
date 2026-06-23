# Tracker — Backend

REST API на **Express + Prisma + PostgreSQL (Neon)**. Реалізує контракт
[docs/api-contract.md](../docs/api-contract.md): auth (access+refresh), CRUD навичок та відміток.

## Запуск (локально)

```bash
cd backend
cp .env.example .env          # заповни DATABASE_URL / DIRECT_URL (Neon) + JWT_ACCESS_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate        # створює таблиці в БД
npm run db:seed               # (опц.) демо-юзер demo@tracker.app / password123
npm run dev                   # http://localhost:3000
```

## Команди

| Команда | Дія |
|---|---|
| `npm run dev` | dev-сервер (tsx watch, hot-reload) |
| `npm run build` / `npm start` | компіляція в `dist/` / запуск |
| `npm run typecheck` | перевірка типів без емісії |
| `npm run prisma:migrate` | dev-міграція (potrebує `DIRECT_URL`) |
| `npm run prisma:deploy` | застосувати міграції (prod) |
| `npm run prisma:studio` | GUI БД |
| `npm run db:seed` | сід демо-даних |

## Ендпоінти

- **Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`,
  `GET /auth/me`, `POST /auth/oauth/:provider` (501, відкладено).
- **Habits:** `GET/POST /habits`, `PATCH/DELETE /habits/:id`.
- **Entries:** `GET /entries?from&to`, `PUT /entries`.
- **Health:** `GET /health`.

Деталі ідіом (структура, auth-flow, error-handler) — у [CLAUDE.md](CLAUDE.md).
