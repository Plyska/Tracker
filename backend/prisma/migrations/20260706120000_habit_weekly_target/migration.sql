-- Habit: optional weekly frequency target ("N times per week").
-- NULL = daily habit (metrics count every day, unchanged behavior); 1..6 = weekly target
-- (stats aggregate over Mon–Sun weeks, full-target denominator). See ADR 0010.
ALTER TABLE "Habit" ADD COLUMN "weeklyTarget" INTEGER;
