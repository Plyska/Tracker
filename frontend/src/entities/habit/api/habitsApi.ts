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

    // Stats залежить від набору активних навичок (total, breakdown, best habit), тож будь-яка
    // зміна навичок (додавання/архів/перейменування/видалення) мусить інвалідувати `Stats/LIST` —
    // інакше картки статистики лишаються застарілими (аж до видалених навичок у breakdown).
    addHabit: build.mutation<Habit, CreateHabitRequest>({
      query: (body) => ({ url: "/habits", method: "POST", body }),
      transformResponse: toHabit,
      invalidatesTags: [
        { type: "Habit", id: "LIST" },
        { type: "Stats", id: "LIST" },
      ],
    }),

    updateHabit: build.mutation<Habit, { id: string } & UpdateHabitRequest>({
      query: ({ id, ...patch }) => ({
        url: `/habits/${id}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: toHabit,
      // Тільки архівування/розархівування змінює набір активних звичок → Stats. Перейменування/
      // колір не чіпають цифр (breakdown резолвить ім'я зі списку навичок) → зайвий рефетч не робимо.
      invalidatesTags: (_r, _e, { id, ...patch }) => [
        { type: "Habit" as const, id },
        { type: "Habit" as const, id: "LIST" },
        ...("archived" in patch
          ? [{ type: "Stats" as const, id: "LIST" }]
          : []),
      ],
    }),

    deleteHabit: build.mutation<void, string>({
      query: (id) => ({ url: `/habits/${id}`, method: "DELETE" }),
      // Каскад: видалення навички прибирає її entries (§5.2) → інвалідуємо Entry і Stats.
      invalidatesTags: (_r, _e, id) => [
        { type: "Habit", id },
        { type: "Habit", id: "LIST" },
        { type: "Entry", id: "LIST" },
        { type: "Stats", id: "LIST" },
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
