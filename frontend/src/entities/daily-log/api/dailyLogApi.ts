import { baseApi } from "@/shared/api";
import type { DailyLogDto, UpsertDailyLogRequest } from "@/shared/api";
import type { DailyLog } from "../model/types";

export interface DailyLogRange {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
}

/** DTO → domain: опційний `notes` контракту (`null`) → `undefined`. */
const toDailyLog = (dto: DailyLogDto): DailyLog => ({
  date: dto.date,
  mood: dto.mood,
  notes: dto.notes ?? undefined,
});

/**
 * Денні логи настрою (`DailyLog`). Кеш per-range; спільний тег `DailyLog/LIST`.
 * upsert інвалідовує і `Stats` — настрій бере участь у mood-метриках/кореляції.
 */
export const dailyLogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getDailyLogs: build.query<DailyLog[], DailyLogRange>({
      query: ({ from, to }) => ({ url: "/daily-logs", params: { from, to } }),
      transformResponse: (dtos: DailyLogDto[]) => dtos.map(toDailyLog),
      providesTags: [{ type: "DailyLog", id: "LIST" }],
    }),

    upsertDailyLog: build.mutation<DailyLog, UpsertDailyLogRequest>({
      query: (body) => ({ url: "/daily-logs", method: "PUT", body }),
      transformResponse: toDailyLog,
      invalidatesTags: [
        { type: "DailyLog", id: "LIST" },
        { type: "Stats", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetDailyLogsQuery, useUpsertDailyLogMutation } = dailyLogApi;
