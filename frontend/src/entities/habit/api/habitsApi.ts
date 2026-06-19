import { baseApi } from "@/shared/api";
import type {
  CreateHabitRequest,
  HabitDto,
  UpdateHabitRequest,
} from "@/shared/api";
import type { Habit } from "../model/types";

/** DTO → domain: опційні поля контракту (`null`) → `undefined` доменної моделі. */
const toHabit = (dto: HabitDto): Habit => ({
  id: dto.id,
  name: dto.name,
  color: dto.color,
  icon: dto.icon ?? undefined,
  createdAt: dto.createdAt,
  archived: dto.archived,
});

export const habitsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHabits: build.query<Habit[], void>({
      query: () => ({ url: "/habits" }),
      transformResponse: (dtos: HabitDto[]) => dtos.map(toHabit),
      providesTags: (result) =>
        result
          ? [
              ...result.map((h) => ({ type: "Habit" as const, id: h.id })),
              { type: "Habit" as const, id: "LIST" },
            ]
          : [{ type: "Habit" as const, id: "LIST" }],
    }),

    addHabit: build.mutation<Habit, CreateHabitRequest>({
      query: (body) => ({ url: "/habits", method: "POST", body }),
      transformResponse: toHabit,
      invalidatesTags: [{ type: "Habit", id: "LIST" }],
    }),

    updateHabit: build.mutation<Habit, { id: string } & UpdateHabitRequest>({
      query: ({ id, ...patch }) => ({
        url: `/habits/${id}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: toHabit,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Habit", id },
        { type: "Habit", id: "LIST" },
      ],
    }),

    deleteHabit: build.mutation<void, string>({
      query: (id) => ({ url: `/habits/${id}`, method: "DELETE" }),
      // Каскад: видалення навички прибирає її entries (§5.2) → інвалідуємо й Entry.
      invalidatesTags: (_r, _e, id) => [
        { type: "Habit", id },
        { type: "Habit", id: "LIST" },
        { type: "Entry", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetHabitsQuery,
  useAddHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
} = habitsApi;
