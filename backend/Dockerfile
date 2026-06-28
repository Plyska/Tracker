# Tracker backend — dev-образ (tsx watch, hot-reload). Прод-образ (multi-stage build) — на фазі деплою.
FROM node:22-alpine

WORKDIR /app

# Залежності окремим шаром (кеш). Prisma generate — після copy схеми.
COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]
