import { nanoid } from "@reduxjs/toolkit";
import type { User } from "@/entities/user";
import type { LoginValues, RegisterValues } from "../model/schema";

/**
 * Викидний мок-сервіс автентифікації (frontend-first, ADR 0003): фейк-async, штучна затримка,
 * завжди успіх. Фаза 9 замінить тіло на HTTP-виклики — сигнатури лишаються незмінні.
 */
export type AuthResult = { user: User; token: string };

// Apple відкладено на невизначений термін — лишаємо лише Google (шов union легко розширити).
export type OAuthProvider = "google";

const MOCK_DELAY_MS = 700;

const wait = (ms = MOCK_DELAY_MS) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function makeUser(email: string, name?: string): User {
  return {
    id: nanoid(),
    email: email.trim(),
    name: name?.trim() || undefined,
    plan: "pro", // політика релізу: усі фічі відкриті (monetization.md)
    role: "user",
  };
}

const makeToken = () => `mock-token-${nanoid()}`;

export async function mockLogin({ email }: LoginValues): Promise<AuthResult> {
  await wait();
  return { user: makeUser(email), token: makeToken() };
}

export async function mockRegister({
  email,
  name,
}: RegisterValues): Promise<AuthResult> {
  await wait();
  return { user: makeUser(email, name), token: makeToken() };
}

export async function mockOAuth(provider: OAuthProvider): Promise<AuthResult> {
  await wait();
  return { user: makeUser(`user@${provider}.com`), token: makeToken() };
}
