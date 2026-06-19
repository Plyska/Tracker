import { createApi } from "@reduxjs/toolkit/query/react";
import { mockBaseQuery } from "./mockBaseQuery";

/**
 * Єдиний кореневий API-слайс. Endpoints додаються через `injectEndpoints` у слайсах-власниках
 * (entities/habit, entities/habit-entry, features/auth) — кожен володіє своїм шматком контракту,
 * cross-slice доступ — через публічні хуки. baseQuery — мок (Фаза 9); backend-фаза підмінить
 * його на `fetchBaseQuery` без зміни endpoints.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: mockBaseQuery,
  tagTypes: ["Habit", "Entry", "Me"],
  endpoints: () => ({}),
});
