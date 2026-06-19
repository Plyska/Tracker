import { createApp } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Tracker API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Грейсфул-шатдаун: закриваємо HTTP і конект до БД.
const shutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => undefined);
  await prisma.$disconnect();
  process.exit(0);
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
