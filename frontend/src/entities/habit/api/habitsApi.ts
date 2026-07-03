import { baseApi } from "@/shared/api";
import type {
  CreateHabitRequest,
  HabitDto,
  TrashedHabitDto,
  UpdateHabitRequest,
} from "@/shared/api";
import type { Habit, TrashedHabit } from "../model/types";

/** DTO → domain: опційні поля контракту (`null`) → `undefined` доменної моделі. */
const toHabit = (dto: HabitDto): Habit => ({
  id: dto.id,
  name: dto.name,
  color: dto.color,
  icon: dto.icon ?? undefined,
  createdAt: dto.createdAt,
});

const toTrashedHabit = (dto: TrashedHabitDto): TrashedHabit => ({
  ...toHabit(dto),
  deletedAt: dto.deletedAt,
  purgeAt: dto.purgeAt,
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

    // Кошик (soft-deleted навички). Окремий тег `Trash` — інвалідується delete/restore/permanent.
    getTrashedHabits: build.query<TrashedHabit[], void>({
      query: () => ({ url: "/habits/trash" }),
      transformResponse: (dtos: TrashedHabitDto[]) => dtos.map(toTrashedHabit),
      providesTags: [{ type: "Trash", id: "LIST" }],
    }),

    // Stats залежить від набору активних навичок (total, breakdown, best habit), тож будь-яка
    // зміна набору (додавання/видалення/відновлення) інвалідує `Stats/LIST`.
    addHabit: build.mutation<Habit, CreateHabitRequest>({
      query: (body) => ({ url: "/habits", method: "POST", body }),
      transformResponse: toHabit,
      invalidatesTags: [
        { type: "Habit", id: "LIST" },
        { type: "Stats", id: "LIST" },
      ],
    }),

    // Перейменування/колір/іконка — не чіпають набір активних навичок → Stats не інвалідуємо
    // (breakdown резолвить ім'я зі списку навичок). Видалення/відновлення — окремі мутації нижче.
    updateHabit: build.mutation<Habit, { id: string } & UpdateHabitRequest>({
      query: ({ id, ...patch }) => ({
        url: `/habits/${id}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: toHabit,
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Habit" as const, id },
        { type: "Habit" as const, id: "LIST" },
      ],
    }),

    // Видалення: за замовчуванням у кошик (soft), `permanent` — одразу назавжди (каскад entries).
    // Обидва прибирають навичку з активного списку → Habit/Entry/Stats; soft ще й наповнює Trash.
    deleteHabit: build.mutation<void, { id: string; permanent?: boolean }>({
      query: ({ id, permanent }) => ({
        url: `/habits/${id}${permanent ? "?permanent=true" : ""}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Habit", id },
        { type: "Habit", id: "LIST" },
        { type: "Trash", id: "LIST" },
        { type: "Entry", id: "LIST" },
        { type: "Stats", id: "LIST" },
      ],
    }),

    // Відновлення з кошика: повертає навичку в активний список.
    restoreHabit: build.mutation<Habit, string>({
      query: (id) => ({ url: `/habits/${id}/restore`, method: "POST" }),
      transformResponse: toHabit,
      invalidatesTags: (_r, _e, id) => [
        { type: "Habit", id },
        { type: "Habit", id: "LIST" },
        { type: "Trash", id: "LIST" },
        { type: "Entry", id: "LIST" },
        { type: "Stats", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetHabitsQuery,
  useGetTrashedHabitsQuery,
  useAddHabitMutation,
  useUpdateHabitMutation,
  useDeleteHabitMutation,
  useRestoreHabitMutation,
} = habitsApi;
