-- Підтвердження пошти й скидання пароля.
-- NULL у emailVerifiedAt = не підтверджено; наявні акаунти лишаються непідтвердженими свідомо:
-- ми не можемо заднім числом стверджувати, що адреса робоча.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");
CREATE INDEX "EmailToken_userId_type_idx" ON "EmailToken"("userId", "type");
CREATE INDEX "EmailToken_expiresAt_idx" ON "EmailToken"("expiresAt");

ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
