import { createApi } from "@reduxjs/toolkit/query/react";
import { httpBaseQuery } from "./httpBaseQuery";

/**
 * Єдиний кореневий API-слайс. Endpoints додаються через `injectEndpoints` у слайсах-власниках
 * (entities/habit, entities/habit-entry, features/auth) — кожен володіє своїм шматком контракту,
 * cross-slice доступ — через публічні хуки. baseQuery — реальний HTTP (`httpBaseQuery`:
 * fetchBaseQuery + Bearer + reauth на 401); мок Фази 9 знято разом зі стартом backend.
 */
export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: httpBaseQuery,
  tagTypes: ["Habit", "Entry", "Me", "DailyLog", "Stats"],
  endpoints: () => ({}),
});
