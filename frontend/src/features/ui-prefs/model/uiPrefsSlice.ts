import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Межі ручного ресайзу колонки назви в таблиці навичок (px). */
export const HABIT_COL_MIN = 140;
export const HABIT_COL_MAX = 480;

/**
 * Орієнтація таблиці навичок (і для тижня, і для місяця):
 *  - `columns` — дні в колонках (горизонтальний скрол при місяці);
 *  - `rows`    — дні в рядках, навички в колонках (вертикальний скрол).
 */
export type TableLayout = "columns" | "rows";

export type UiPrefsState = {
  /** null → адаптивний дефолт (CSS-сітка), користувач ще не міняв ширину. */
  habitColWidth: number | null;
  tableLayout: TableLayout;
};

const initialState: UiPrefsState = {
  habitColWidth: null,
  tableLayout: "columns",
};

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
    setTableLayout: (state, action: PayloadAction<TableLayout>) => {
      state.tableLayout = action.payload;
    },
  },
});

export const { setHabitColWidth, setTableLayout } = uiPrefsSlice.actions;
export default uiPrefsSlice.reducer;
