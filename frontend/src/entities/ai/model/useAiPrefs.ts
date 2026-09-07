import { useCallback } from "react";
import { useAppSelector } from "@/app/store/hooks";
import { selectIsAuthenticated } from "@/features/auth";
import {
  useGetPreferencesQuery,
  useUpdatePreferencesMutation,
} from "@/entities/user";

/**
 * Прапорці AI-помічника (ADR 0012) як СЕРВЕРНИЙ стан, а не UI-префа.
 *
 * Свідомо не в `uiPrefsSlice` і не в debounce-синку `PreferencesSync`: згода — це явне рішення
 * користувача. У синк-петлі локальний дефолт `false` міг би до гідрації затерти `aiEnabled`,
 * увімкнений на іншому пристрої, а `aiConsentAt` узагалі виставляє сервер.
 * Тому читаємо з `/me/preferences` і пишемо явними мутаціями (згода / тумблери в Settings).
 */

/** Кількість варіантів формулювання підказки — має збігатися з VARIANTS в ai.insights.ts. */
export const INSIGHT_VARIANTS = 3;

export interface AiPrefs {
  enabled: boolean;
  diaryOptIn: boolean;
  /** null → згоди ще не було: показуємо екран згоди, а не тумблер. */
  consentAt: string | null;
  isLoading: boolean;
}

export function useAiPrefs(): AiPrefs {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const { data, isLoading } = useGetPreferencesQuery(undefined, {
    skip: !isAuthenticated,
  });
  return {
    enabled: data?.aiEnabled === true,
    diaryOptIn: data?.aiDiaryOptIn === true,
    consentAt: data?.aiConsentAt ?? null,
    isLoading: isAuthenticated && isLoading,
  };
}

/** Записати прапорці. Повертає проміс — щоб UI міг дочекатись і одразу згенерувати лист. */
export function useSetAiPrefs() {
  const [updatePreferences, state] = useUpdatePreferencesMutation();
  const setAiPrefs = useCallback(
    (patch: { aiEnabled?: boolean; aiDiaryOptIn?: boolean }) =>
      updatePreferences(patch).unwrap(),
    [updatePreferences],
  );
  return [setAiPrefs, state] as const;
}
