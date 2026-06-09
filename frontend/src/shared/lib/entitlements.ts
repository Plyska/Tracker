/**
 * Шов entitlements (корінь CLAUDE.md §5.7) — ЄДИНА точка гейтингу premium-фіч,
 * замість розкиданих `if (plan === 'pro')`. Кожна Pro-фіча вже обгорнута в
 * `useEntitlement(...)`, тож розділення на тарифи вмикається БЕЗ змін UI.
 *
 * ПОЛІТИКА РЕЛІЗУ: на старті всі фічі доступні всім → `MOCK_PLAN = 'pro'` навмисно
 * (це не дев-хак, не повертати на 'free'). Тарифи Free/Pro вмикаються пізніше: коли
 * зʼявиться auth/підписки (Фаза 8 / backend), `plan` стане похідним від `UserDto.plan`
 * (поле в БД) / активної підписки — і поділ запрацює лише зміною плану в базі.
 *
 * Щоб локально перевірити Free-поведінку (замки/апсели) — тимчасово зміни на 'free'.
 */
export type Plan = "free" | "pro";

export type Entitlement =
  | "unlimited-habits"
  | "advanced-stats"
  | "customization"
  | "table-layout";

// Реліз: усі як 'pro' (усі фічі відкриті). Згодом — похідне від UserDto.plan з БД.
const MOCK_PLAN: Plan = "pro";

const ENTITLEMENTS: Record<Plan, Entitlement[]> = {
  free: [],
  pro: ["unlimited-habits", "advanced-stats", "customization", "table-layout"],
};

export function useEntitlement(feature: Entitlement): boolean {
  return ENTITLEMENTS[MOCK_PLAN].includes(feature);
}
