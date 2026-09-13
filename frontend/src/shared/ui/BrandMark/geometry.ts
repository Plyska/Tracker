/**
 * Геометрія знака «колонка дня» — єдине джерело для React-гліфа (BrandMark.tsx), динамічного
 * фавікона (favicon.ts) і статичного `public/favicon.svg` (той — копія виводу, при зміні
 * перегенерувати). Усе в полі 32×32.
 */
export interface MarkGeometry {
  /** Координати початку клітинок по обох осях (сітка квадратна). */
  positions: readonly number[];
  size: number;
  radius: number;
}

/**
 * Повна сітка 3×3: клітинка 7, зазор 4 (= 2px у фавіконі 16px — клітинки не злипаються).
 * Радіус — 1/4 сторони, як у чекбокса дашборда (`h-8 rounded-md` = 8/32); плашка навколо знака
 * (BrandBadge `rounded-md`, фавікон rx 8/32) тримає ту саму пропорцію.
 */
export const GRID: MarkGeometry = { positions: [1.5, 12.5, 23.5], size: 7, radius: 1.75 };

/** Зріз 2×2 для ≤16px: у плашці 3×3 стає текстурою, тож лишаємо суть — минуле ліворуч, сьогодні праворуч. */
export const CUT: MarkGeometry = { positions: [5, 17.5], size: 9.5, radius: 2.4 };

/** Минулі дні — той самий колір, приглушений; сьогоднішня (права) колонка — суцільна. */
export const PAST_OPACITY = 0.26;

export interface MarkCell {
  x: number;
  y: number;
  today: boolean;
}

/** Клітинки сітки рядок за рядком; `today` — права колонка. */
export function cells({ positions }: MarkGeometry): MarkCell[] {
  const last = positions[positions.length - 1];
  return positions.flatMap((y) => positions.map((x) => ({ x, y, today: x === last })));
}
