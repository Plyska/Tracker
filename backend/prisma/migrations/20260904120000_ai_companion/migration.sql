-- AI companion (ADR 0012).
-- NOTE: the live DB also carries a stale "UserPreferences"."habitColWidth" column that is absent
-- from schema.prisma (pre-existing drift, unrelated to this feature). Deliberately NOT dropped here —
-- a destructive change needs its own explicit decision/migration.

-- UserPreferences: opt-in flags (NULL = not set → client treats as false) + consent timestamp.
-- aiConsentAt is set server-side on the FIRST aiEnabled=true (informed-consent evidence, GDPR).
ALTER TABLE "UserPreferences"
ADD COLUMN     "aiConsentAt" TIMESTAMP(3),
ADD COLUMN     "aiDiaryOptIn" BOOLEAN,
ADD COLUMN     "aiEnabled" BOOLEAN;

-- AiReflection: cache of generated reflections, one row per (user, period, periodKey).
-- Repeat opens are served from cache (0 tokens); the history view is a by-product of the cache.
-- "content" is SENSITIVE (may paraphrase diary entries) — never log it.
CREATE TABLE "AiReflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReflection_pkey" PRIMARY KEY ("id")
);

-- AiUsage: per-user daily quota counters (429 AI_QUOTA_EXCEEDED above AI_DAILY_MESSAGE_LIMIT).
-- "day" is the client's local date (same convention as /stats `to`) — no TZ drift.
CREATE TABLE "AiUsage" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("userId","day")
);

-- CreateIndex
CREATE INDEX "AiReflection_userId_idx" ON "AiReflection"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AiReflection_userId_period_periodKey_key" ON "AiReflection"("userId", "period", "periodKey");

-- AddForeignKey
ALTER TABLE "AiReflection" ADD CONSTRAINT "AiReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiUsage" ADD CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
