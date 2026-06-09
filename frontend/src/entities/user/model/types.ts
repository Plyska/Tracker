import type { Plan } from "@/shared/lib";

/**
 * Роль = вісь авторизації (що дозволено в системі), ортогональна `plan` (за що заплачено).
 * Мінімально дві ролі; розширюємо лише за реальним сценарієм (команда / публічний UGC).
 * Реальний захист — на backend; на фронті `role` лише для UI. Див. ADR 0006.
 */
export type Role = "user" | "admin";

export interface User {
  id: string;
  email: string;
  name?: string;
  // URL аватара; реальний upload (сховище) — backend-фаза, на моку — лише UI-превʼю
  avatarUrl?: string;
  // plan похідний від активної підписки (monetization.md); на старті — 'pro' (політика релізу)
  plan: Plan;
  role: Role;
}
