-- Widget-visibility preference: list of hidden statistics-widget keys (empty = all visible).
ALTER TABLE "UserPreferences"
    ADD COLUMN "hiddenStatWidgets" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
