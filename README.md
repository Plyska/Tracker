# Tracker

Платформа для відслідковування власних навичок та звичок.
Деталі ідеї та покроковий план — у [CLAUDE.md](./CLAUDE.md).

## Структура (монорепо)

```
tracker/
  frontend/   # React 19 + TypeScript + Vite (UI)
  backend/    # Node.js + Express (поки порожньо)
  docker-compose.yml
```

## Запуск frontend через Docker

```bash
docker compose up frontend        # підняти (build при першому запуску)
docker compose up --build frontend # перебудувати образ і підняти
docker compose down               # зупинити
```

Після старту dev-сервер доступний на http://localhost:5173 (з hot-reload — код
монтується у контейнер).

## Запуск frontend локально (без Docker)

```bash
cd frontend
npm install
npm run dev
```
