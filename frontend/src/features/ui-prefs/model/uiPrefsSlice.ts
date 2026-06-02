import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Межі ручного ресайзу колонки назви в таблиці навичок (px). */
export const HABIT_COL_MIN = 140;
export const HABIT_COL_MAX = 480;

/** null → адаптивний дефолт (CSS-сітка), користувач ще не міняв ширину. */
export type UiPrefsState = { habitColWidth: number | null };

const initialState: UiPrefsState = { habitColWidth: null };

/** Клієнтські UI-налаштування, що персистяться (як тема/акцент/мова). */
const uiPrefsSlice = createSlice({
  name: "uiPrefs",
  initialState,
  reducers: {
    setHabitColWidth: (state, action: PayloadAction<number | null>) => {
      state.habitColWidth =
        action.payload === null
          ? null
          : Math.min(HABIT_COL_MAX, Math.max(HABIT_COL_MIN, action.payload));
    },
  },
});

export const { setHabitColWidth } = uiPrefsSlice.actions;
export default uiPrefsSlice.reducer;
