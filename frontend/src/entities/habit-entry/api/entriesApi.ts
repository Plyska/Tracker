import { baseApi } from "@/shared/api";
import type { ToggleEntryRequest } from "@/shared/api";
import type { HabitEntry } from "../model/types";

export interface EntriesRange {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
}

/**
 * HabitEntryDto структурно тотожний доменному HabitEntry — мапінг не потрібен.
 * Кеш — per-range (ключ args = {from,to}); усі діапазони мають спільний тег `Entry/LIST`,
 * щоб оптимістичний toggle міг пропатчити будь-який активний діапазон.
 */
export const entriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getEntries: build.query<HabitEntry[], EntriesRange>({
      query: ({ from, to }) => ({ url: "/entries", params: { from, to } }),
      providesTags: [{ type: "Entry", id: "LIST" }],
    }),

    toggleEntry: build.mutation<HabitEntry, ToggleEntryRequest>({
      query: (body) => ({ url: "/entries", method: "PUT", body }),
      // Оптимістично патчимо всі закешовані діапазони, що містять цю дату — без рефетчу
      // (інакше сітка миготіла б). Відкат на помилку.
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const patches = entriesApi.util
          .selectInvalidatedBy(getState(), [{ type: "Entry", id: "LIST" }])
          .filter((entry) => entry.endpointName === "getEntries")
          .map(({ originalArgs }) => {
            const { from, to } = originalArgs as EntriesRange;
            if (arg.date < from || arg.date > to) return null;
            return dispatch(
              entriesApi.util.updateQueryData(
                "getEntries",
                originalArgs as EntriesRange,
                (draft) => {
                  const idx = draft.findIndex(
                    (e) => e.habitId === arg.habitId && e.date === arg.date,
                  );
                  if (arg.done) {
                    if (idx === -1) draft.push({ ...arg });
                    else draft[idx] = { ...arg };
                  } else if (idx !== -1) {
                    draft.splice(idx, 1);
                  }
                },
              ),
            );
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),
  }),
});

export const { useGetEntriesQuery, useToggleEntryMutation } = entriesApi;
