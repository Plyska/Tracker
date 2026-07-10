import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Межі ручного ресайзу колонки назви в таблиці навичок (px). */
export const HABIT_COL_MIN = 140;
export const HABIT_COL_MAX = 480;

/** Межі масштабу тексту редактора дня (zoom). */
export const EDITOR_SCALE_MIN = 0.8;
export const EDITOR_SCALE_MAX = 1.5;

/**
 * Орієнтація таблиці навичок (і для тижня, і для місяця):
 *  - `columns` — дні в колонках (горизонтальний скрол при місяці);
 *  - `rows`    — дні в рядках, навички в колонках (вертикальний скрол).
 */
export type TableLayout = "columns" | "rows";

/**
 * Вигляд рядків у редакторі задач дня:
 *  - `checkbox`  — чекбокси;
 *  - `numbered`  — нумерований список (1, 2, 3);
 *  - `timeline`  — чекбокс + редагована година (розклад дня).
 */
export type TaskListStyle = "checkbox" | "numbered" | "timeline";

export type UiPrefsState = {
  /** null → адаптивний дефолт (CSS-сітка), користувач ще не міняв ширину. */
  habitColWidth: number | null;
  tableLayout: TableLayout;
  /** Цільовий % виконання для статистики (0..100). null → ціль не задано. */
  statsGoalPct: number | null;
  /** Ключі прихованих віджетів статистики. Зберігаємо саме приховані → нові картки типово видимі. */
  hiddenStatWidgets: string[];
  /** Маркер рядків у редакторі задач дня. */
  taskListStyle: TaskListStyle;
  /** Масштаб тексту редактора дня (zoom), 0.8–1.5. */
  editorScale: number;
};

const initialState: UiPrefsState = {
  habitColWidth: null,
  tableLayout: "columns",
  statsGoalPct: null,
  hiddenStatWidgets: [],
  taskListStyle: "checkbox",
  editorScale: 1,
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
    setStatsGoal: (state, action: PayloadAction<number | null>) => {
      state.statsGoalPct =
        action.payload === null
          ? null
          : Math.min(100, Math.max(0, Math.round(action.payload)));
    },
    /** Перемкнути видимість віджета статистики за ключем. */
    toggleStatWidget: (state, action: PayloadAction<string>) => {
      const key = action.payload;
      state.hiddenStatWidgets = state.hiddenStatWidgets.includes(key)
        ? state.hiddenStatWidgets.filter((k) => k !== key)
        : [...state.hiddenStatWidgets, key];
    },
    /** Замінити набір прихованих (гідрація з БД). */
    setHiddenStatWidgets: (state, action: PayloadAction<string[]>) => {
      state.hiddenStatWidgets = action.payload;
    },
    setTaskListStyle: (state, action: PayloadAction<TaskListStyle>) => {
      state.taskListStyle = action.payload;
    },
    setEditorScale: (state, action: PayloadAction<number>) => {
      state.editorScale = Math.min(
        EDITOR_SCALE_MAX,
        Math.max(EDITOR_SCALE_MIN, action.payload),
      );
    },
  },
});

export const {
  setHabitColWidth,
  setTableLayout,
  setStatsGoal,
  toggleStatWidget,
  setHiddenStatWidgets,
  setTaskListStyle,
  setEditorScale,
} = uiPrefsSlice.actions;
export default uiPrefsSlice.reducer;
