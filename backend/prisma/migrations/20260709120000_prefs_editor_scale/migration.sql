-- Editor text-scale preference (zoom): float multiplier 0.8–1.5 (null = default 1).
ALTER TABLE "UserPreferences"
    ADD COLUMN "editorScale" DOUBLE PRECISION;
