import { baseApi } from "@/shared/api";
import type { StatsDto, StatsQuery } from "@/shared/api";
import type { Stats } from "../model/types";

/**
 * Агрегації статистики (`GET /stats`). Кеш per-args ({from,to,habitId}); спільний тег
 * `Stats/LIST`. Інвалідовується мутаціями entries (toggle) і daily-logs (mood) — тож картки
 * й графіки оновлюються, коли користувач відмічає звичку чи логує настрій.
 *
 * StatsDto структурно тотожний доменному Stats — transform не потрібен.
 */
export const statsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getStats: build.query<Stats, StatsQuery>({
      query: ({ from, to, habitId }) => ({
        url: "/stats",
        params: { from, to, ...(habitId ? { habitId } : {}) },
      }),
      transformResponse: (dto: StatsDto): Stats => dto,
      providesTags: [{ type: "Stats", id: "LIST" }],
    }),
  }),
});

export const { useGetStatsQuery } = statsApi;
