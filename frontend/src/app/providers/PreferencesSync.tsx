import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store/hooks";
import { selectIsAuthenticated } from "@/features/auth";
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from "@/entities/user";
import type { UpdatePreferencesRequest } from "@/shared/api";
import { setTheme, type Theme } from "@/features/theme";
import { setAccent, type AccentKey } from "@/features/accent";
import { setLocale } from "@/features/locale";
import {
  setHiddenStatWidgets,
  setStatsGoal,
  setTableLayout,
  type TableLayout,
} from "@/features/ui-prefs";
import type { Locale } from "@/shared/config/i18n";

// Короткий debounce: префи дискретні (клік/тумблер/дропдаун), тож головна роль — схлопнути
// дубль-події однієї взаємодії, а не батчити різні налаштування. 250 мс майже миттєво зберігає
// й мінімізує ризик втрати зміни при швидкому закритті вкладки.
const PUSH_DELAY = 250;

const sameSet = (a?: string[], b?: string[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((x) => b.includes(x));
};

const samePrefs = (
  a: UpdatePreferencesRequest,
  b: UpdatePreferencesRequest,
): boolean =>
  a.theme === b.theme &&
  a.accent === b.accent &&
  a.locale === b.locale &&
  a.tableLayout === b.tableLayout &&
  a.statsGoalPct === b.statsGoalPct &&
  sameSet(a.hiddenStatWidgets, b.hiddenStatWidgets);

/**
 * Синхронізація клієнтських налаштувань із БД (крос-девайс). Значення персистяться в
 * localStorage (миттєвий рендер + робота до логіну) — це лишається; тут поверх додаємо БД:
 *  - на підтвердженні сесії тягнемо `/me/preferences`; непусті поля → гідруємо слайси (БД wins);
 *  - якщо в БД порожньо (перший вхід) — засіваємо її з поточних локальних значень;
 *  - будь-яка подальша зміна префи → debounced `PATCH`.
 * Живе в `app/providers` (координує кілька features — як `SessionProvider`).
 */
export function PreferencesSync() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { data } = useGetPreferencesQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [updatePreferences] = useUpdatePreferencesMutation();

  const theme = useAppSelector((s) => s.theme.value);
  const accent = useAppSelector((s) => s.accent.value);
  const locale = useAppSelector((s) => s.locale.value);
  const tableLayout = useAppSelector((s) => s.uiPrefs.tableLayout);
  const statsGoalPct = useAppSelector((s) => s.uiPrefs.statsGoalPct);
  const hiddenStatWidgets = useAppSelector((s) => s.uiPrefs.hiddenStatWidgets);

  const hydrated = useRef(false);
  const lastSynced = useRef<UpdatePreferencesRequest | null>(null);

  // Логаут → скидаємо стан, щоб повторний вхід рехідрував.
  useEffect(() => {
    if (!isAuthenticated) {
      hydrated.current = false;
      lastSynced.current = null;
    }
  }, [isAuthenticated]);

  // Гідрація (одноразово на сесію): непусті поля БД перекривають локальні.
  useEffect(() => {
    if (!isAuthenticated || !data || hydrated.current) return;
    hydrated.current = true;

    const hasRemote = Object.values(data).some((v) => v !== null);
    if (!hasRemote) return; // БД порожня → push-ефект нижче засіє локальні значення

    if (data.theme) dispatch(setTheme(data.theme as Theme));
    if (data.accent) dispatch(setAccent(data.accent as AccentKey));
    if (data.locale) dispatch(setLocale(data.locale as Locale));
    if (data.tableLayout) dispatch(setTableLayout(data.tableLayout as TableLayout));
    if (data.statsGoalPct !== null) dispatch(setStatsGoal(data.statsGoalPct));
    if (data.hiddenStatWidgets)
      dispatch(setHiddenStatWidgets(data.hiddenStatWidgets));

    // Значення, що тепер у стані (для непустих — з БД, для null — локальні) = синхронізовані.
    lastSynced.current = {
      theme: data.theme ?? theme,
      accent: data.accent ?? accent,
      locale: data.locale ?? locale,
      tableLayout: data.tableLayout ?? tableLayout,
      statsGoalPct: data.statsGoalPct ?? statsGoalPct,
      hiddenStatWidgets: data.hiddenStatWidgets ?? hiddenStatWidgets,
    };
  }, [
    isAuthenticated,
    data,
    dispatch,
    theme,
    accent,
    locale,
    tableLayout,
    statsGoalPct,
    hiddenStatWidgets,
  ]);

  // Push змін у БД (debounced). Спрацьовує і як seed, коли lastSynced ще null (порожня БД).
  useEffect(() => {
    if (!isAuthenticated || !hydrated.current) return;
    const current: UpdatePreferencesRequest = {
      theme,
      accent,
      locale,
      tableLayout,
      statsGoalPct,
      hiddenStatWidgets,
    };
    if (lastSynced.current && samePrefs(current, lastSynced.current)) return;

    const id = setTimeout(() => {
      void updatePreferences(current);
      lastSynced.current = current;
    }, PUSH_DELAY);
    return () => clearTimeout(id);
  }, [
    isAuthenticated,
    theme,
    accent,
    locale,
    tableLayout,
    statsGoalPct,
    hiddenStatWidgets,
    updatePreferences,
  ]);

  return null;
}
