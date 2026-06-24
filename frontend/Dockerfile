FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# --legacy-peer-deps: i18next@24 оголошує peerOptional typescript@^5, а проєкт на TS 6 (навмисно);
# строгий npm ci інакше падає на ERESOLVE. Дзеркалить локальну інсталяцію.
RUN npm ci --legacy-peer-deps

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
