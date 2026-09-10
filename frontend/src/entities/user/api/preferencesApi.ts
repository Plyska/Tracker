import { baseApi } from "@/shared/api";
import type { PreferencesDto, UpdatePreferencesRequest } from "@/shared/api";

/**
 * Клієнтські налаштування в БД (крос-девайс). Значення живуть у feature-слайсах (theme/accent/…);
 * цей транспорт лише читає/пише їх на сервері. Координацію (гідрація + push) робить `PreferencesSync`.
 */
export const preferencesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPreferences: build.query<PreferencesDto, void>({
      query: () => ({ url: "/me/preferences" }),
    }),
    updatePreferences: build.mutation<PreferencesDto, UpdatePreferencesRequest>({
      query: (body) => ({ url: "/me/preferences", method: "PATCH", body }),
      // Патчимо кеш відповіддю сервера замість інвалідації: `PreferencesSync` пише сюди на
      // кожну зміну теми/акценту, і рефетч на кожен PATCH був би зайвим колом запитів.
      // Заразом це єдиний спосіб, яким UI бачить СЕРВЕРНІ поля (`aiConsentAt`) одразу.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            preferencesApi.util.updateQueryData(
              "getPreferences",
              undefined,
              () => data,
            ),
          );
        } catch {
          // Помилку показує errorToastMiddleware; кеш лишається як був.
        }
      },
    }),
  }),
});

export const { useGetPreferencesQuery, useUpdatePreferencesMutation } =
  preferencesApi;
