-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mood" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyLog_userId_idx" ON "DailyLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
