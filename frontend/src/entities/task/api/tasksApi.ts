import { baseApi } from "@/shared/api";
import type {
  CreateTaskRequest,
  TaskDto,
  UpdateTaskRequest,
} from "@/shared/api";
import type { Task } from "../model/types";

/** DTO → domain: явні `null` контракту → `undefined` доменної моделі. */
const toTask = (dto: TaskDto): Task => ({
  id: dto.id,
  date: dto.date ?? undefined,
  title: dto.title,
  startTime: dto.startTime ?? undefined,
  endTime: dto.endTime ?? undefined,
  habitId: dto.habitId ?? undefined,
  done: dto.done,
  createdAt: dto.createdAt,
});

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getTasks: build.query<Task[], void>({
      query: () => ({ url: "/tasks" }),
      transformResponse: (dtos: TaskDto[]) => dtos.map(toTask),
      providesTags: (result) =>
        result
          ? [
              ...result.map((t) => ({ type: "Task" as const, id: t.id })),
              { type: "Task" as const, id: "LIST" },
            ]
          : [{ type: "Task" as const, id: "LIST" }],
    }),

    addTask: build.mutation<Task, CreateTaskRequest>({
      query: (body) => ({ url: "/tasks", method: "POST", body }),
      transformResponse: toTask,
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),

    updateTask: build.mutation<Task, { id: string } & UpdateTaskRequest>({
      query: ({ id, ...patch }) => ({
        url: `/tasks/${id}`,
        method: "PATCH",
        body: patch,
      }),
      transformResponse: toTask,
      // Оптимістично патчимо задачу на місці (без рефетчу, щоб не миготіло). Порядок карток
      // (виконані вниз, за днем/часом) застосовує віджет при рендері — тут лише оновлюємо поля.
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData("getTasks", undefined, (draft) => {
            const task = draft.find((t) => t.id === id);
            if (!task) return;
            Object.assign(task, patch);
            if (patch.date === null) task.date = undefined; // null → «без дати»
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteTask: build.mutation<void, string>({
      query: (id) => ({ url: `/tasks/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Task", id },
        { type: "Task", id: "LIST" },
      ],
    }),

    // Очистити цілу картку: день (`{ date }`) або «Загальну» (`{ general: true }`).
    clearTasks: build.mutation<void, { date?: string; general?: boolean }>({
      query: ({ date, general }) => ({
        url: "/tasks",
        method: "DELETE",
        params: general ? { general: "true" } : { date },
      }),
      invalidatesTags: [{ type: "Task", id: "LIST" }],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useAddTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useClearTasksMutation,
} = tasksApi;
