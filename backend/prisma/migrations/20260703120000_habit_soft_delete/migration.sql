-- Habit: replace the `archived` flag with a soft-delete timestamp (trash + retention).
-- `deletedAt` NULL = active; non-NULL = in trash, purged after TRASH_RETENTION_DAYS.
ALTER TABLE "Habit" DROP COLUMN "archived";
ALTER TABLE "Habit" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Index for the retention purge query (WHERE "deletedAt" < cutoff).
CREATE INDEX "Habit_deletedAt_idx" ON "Habit"("deletedAt");
