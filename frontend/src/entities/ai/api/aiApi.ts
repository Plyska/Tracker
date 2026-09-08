import { baseApi } from "@/shared/api";
import type {
  AiQuotaDto,
  CheckinRequest,
  CheckinResponseDto,
  InsightDto,
  ReflectionDto,
  ReflectionRequest,
  ReflectionSummaryDto,
} from "@/shared/api";

/**
 * AI-помічник (ADR 0012). DTO структурно тотожні доменним типам — transform не потрібен.
 *
 * Кешування навмисно різне за природою даних:
 *  - `getInsights` — дешеві (без LLM), залежать від відміток/настрою → тег `Ai/INSIGHTS`,
 *    який інвалідують мутації entries і daily-logs (щоб підказка не «застрягала» після відмітки);
 *  - `getReflection` — ДОРОГА (LLM), тому це **мутація**: створює рядок і витрачає квоту.
 *    Сервер сам віддає кеш у межах періоду, тож повторний виклик безпечний і безкоштовний.
 */
export const aiApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getInsights: build.query<InsightDto[], { today: string }>({
      query: ({ today }) => ({ url: "/ai/insights", params: { today } }),
      providesTags: [{ type: "Ai", id: "INSIGHTS" }],
    }),

    getReflection: build.mutation<ReflectionDto, ReflectionRequest>({
      query: (body) => ({ url: "/ai/reflection", method: "POST", body }),
      // Новий лист поповнює архів і витрачає квоту.
      invalidatesTags: [
        { type: "Ai", id: "HISTORY" },
        { type: "Ai", id: "QUOTA" },
      ],
    }),

    /**
     * Чек-ін: розбір тексту на дії. Мутація, бо витрачає квоту (сам виклик нічого не пише —
     * запис іде далі через toggleEntry / upsertDailyLog / addTask після підтвердження).
     * Кеш звичок і відміток НЕ інвалідуємо: тут ще нічого не змінилось.
     */
    checkin: build.mutation<CheckinResponseDto, CheckinRequest>({
      query: (body) => ({ url: "/ai/checkin", method: "POST", body }),
      invalidatesTags: [{ type: "Ai", id: "QUOTA" }],
    }),

    getReflections: build.query<ReflectionSummaryDto[], { period: "week" | "month" }>({
      query: ({ period }) => ({ url: "/ai/reflections", params: { period } }),
      providesTags: [{ type: "Ai", id: "HISTORY" }],
    }),

    getAiQuota: build.query<AiQuotaDto, { today: string }>({
      query: ({ today }) => ({ url: "/ai/quota", params: { today } }),
      providesTags: [{ type: "Ai", id: "QUOTA" }],
    }),

    // Лічильники квот сервер не видаляє (це метрика, а не вміст) — тож і поля про них тут немає.
    deleteAiData: build.mutation<{ deletedReflections: number }, void>({
      query: () => ({ url: "/ai/data", method: "DELETE" }),
      invalidatesTags: [
        { type: "Ai", id: "HISTORY" },
        { type: "Ai", id: "QUOTA" },
      ],
    }),
  }),
});

export const {
  useGetInsightsQuery,
  useCheckinMutation,
  useGetReflectionMutation,
  useGetReflectionsQuery,
  useGetAiQuotaQuery,
  useDeleteAiDataMutation,
} = aiApi;
