import app from "./app.js";
import { env } from "./env.js";
import { prisma } from "./prisma.js";

// Беремо той самий екземпляр, що експортує `app.ts`, а не створюємо другий: інакше в пам'яті
// висіли б два застосунки, з яких слухає лише один.

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
