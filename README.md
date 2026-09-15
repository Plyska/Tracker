# Tellday

Платформа для відслідковування власних навичок та звичок.

## Структура (монорепо)

```
tellday/
  frontend/   # React 19 + TypeScript + Vite (застосунок + маркетинговий лендінг)
  backend/    # Node.js + Express + Prisma (PostgreSQL на Neon)
```

## Запуск

Потрібен Node.js 22+.

```bash
# Backend → http://localhost:3000
cd backend
npm install
cp .env.example .env    # заповнити DATABASE_URL і JWT_ACCESS_SECRET
npm run dev
```

```bash
# Frontend → http://localhost:5173
cd frontend
npm install
npm run dev
```

Бекенд потрібен лише для роботи застосунку — лендінг збирається окремою точкою входу
(`landing.html`) і працює самостійно.

## Корисні команди

```bash
# backend
npm run typecheck        # tsc --noEmit
npm run prisma:migrate   # dev-міграція
npm run db:seed:test     # тестовий акаунт із наповненням
npm run email:status     # стан поштового домену в Resend

# frontend
npm run build            # tsc -b + vite build (перевіряє типи)
npm run lint             # ESLint
```
