import bcrypt from "bcryptjs";

// Cost factor 12 — баланс безпеки/латентності (≈250мс на сучасному CPU).
const SALT_ROUNDS = 12;

export const hashPassword = (plain: string): Promise<string> =>
  bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (
  plain: string,
  hash: string,
): Promise<boolean> => bcrypt.compare(plain, hash);
