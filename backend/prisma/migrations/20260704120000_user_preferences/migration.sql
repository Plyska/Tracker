-- Per-user client preferences moved from localStorage into the DB (1:1 with User).
CREATE TABLE "UserPreferences" (
    "userId" TEXT NOT NULL,
    "theme" TEXT,
    "accent" TEXT,
    "locale" TEXT,
    "tableLayout" TEXT,
    "statsGoalPct" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserPreferences"
    ADD CONSTRAINT "UserPreferences_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
