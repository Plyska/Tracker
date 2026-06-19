import type { User } from "@prisma/client";
import { prisma } from "../../prisma.js";
import { Errors } from "../../lib/errors.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

/** Реєстрація: унікальний email, хеш пароля. Повертає створеного користувача. */
export const registerUser = async (input: RegisterInput): Promise<User> => {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw Errors.emailTaken();

  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
    },
  });
};

/** Логін: перевірка пароля. Однакова помилка для «нема юзера» і «невірний пароль» (no user enumeration). */
export const loginUser = async (input: LoginInput): Promise<User> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // OAuth-only акаунт (passwordHash=null) теж не логіниться паролем.
  if (!user?.passwordHash) throw Errors.invalidCredentials();

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw Errors.invalidCredentials();

  return user;
};

export const getUserById = (id: string): Promise<User | null> =>
  prisma.user.findUnique({ where: { id } });
