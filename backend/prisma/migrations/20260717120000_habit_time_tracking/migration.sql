-- Time-tracking (ADR 0011).
-- Habit.weeklyMinutesTarget: NULL = not a timed habit; >0 = weekly target in MINUTES
-- (mutually exclusive with weeklyTarget, enforced by form + zod). done/day = minutes>0.
ALTER TABLE "Habit" ADD COLUMN "weeklyMinutesTarget" INTEGER;

-- HabitEntry.minutes: NULL for binary habits; 0..1440 minutes/day for timed habits.
-- Row exists only while minutes>0 (timed) — sparse model preserved.
ALTER TABLE "HabitEntry" ADD COLUMN "minutes" INTEGER;
