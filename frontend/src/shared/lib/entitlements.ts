/**
 * Шов entitlements (корінь CLAUDE.md §5.7) — ЄДИНА точка гейтингу premium-фіч,
 * замість розкиданих `if (plan === 'pro')`. Зараз `plan` мокнутий (auth/підписки —
 * Фаза 8 / backend); потім стане похідним від `UserDto.plan` / активної підписки.
 *
 * Щоб переглянути Pro-поведінку в деві — тимчасово зміни MOCK_PLAN на 'pro'.
 */
export type Plan = "free" | "pro";

export type Entitlement = "unlimited-habits" | "advanced-stats" | "customization";

const MOCK_PLAN: Plan = "pro";

const ENTITLEMENTS: Record<Plan, Entitlement[]> = {
  free: [],
  pro: ["unlimited-habits", "advanced-stats", "customization"],
};

export function useEntitlement(feature: Entitlement): boolean {
  return ENTITLEMENTS[MOCK_PLAN].includes(feature);
}
