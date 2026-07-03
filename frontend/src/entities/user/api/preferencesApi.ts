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
    }),
  }),
});

export const { useGetPreferencesQuery, useUpdatePreferencesMutation } =
  preferencesApi;
