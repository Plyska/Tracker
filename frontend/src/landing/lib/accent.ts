/**
 * Акцент на лендінгу. Перемикача тут немає — беремо вибір, зроблений у застосунку: FOUC-скрипт у
 * landing.html кладе його з localStorage у `data-accent` до першого рендеру, а `storage`-подія
 * підхоплює зміну з іншої вкладки (перемкнув акцент у продукті — лендінг перефарбувався разом
 * із фавіконом, без перезавантаження). Ключ і формат — як у `app/store`.
 */
import { DEFAULT_ACCENT, isAccentKey, type AccentKey } from "@/shared/config/accents";
import { applyBrandFavicon } from "@/shared/ui/BrandMark";

const ACCENT_KEY = "tracker-accent";

const parseStored = (raw: string | null): AccentKey => {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isAccentKey(value) ? value : DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
};

/** Поточний акцент сторінки — той, що вже стоїть на <html> (або дефолт). */
export const readAccent = (): AccentKey => {
  const current = document.documentElement.dataset.accent;
  return isAccentKey(current) ? current : DEFAULT_ACCENT;
};

/** Фавікон у колір акценту зараз + стеження за зміною акценту в іншій вкладці. */
export function syncAccent(): void {
  applyBrandFavicon(readAccent());
  window.addEventListener("storage", (e) => {
    if (e.key !== ACCENT_KEY) return;
    const accent = parseStored(e.newValue);
    document.documentElement.dataset.accent = accent;
    applyBrandFavicon(accent);
  });
}
