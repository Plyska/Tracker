import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

/** Масштаб статистики. Незалежний від Dashboard-періоду (свій стан). */
export type StatsScale = "week" | "month" | "year" | "all";

type StatsPeriodState = {
  scale: StatsScale;
  /** Фокус на одній звичці (null = усі неархівовані). */
  habitId: string | null;
};

// Session-only: дефолт «місяць», без фільтра.
const initialState: StatsPeriodState = {
  scale: "month",
  habitId: null,
};

const statsPeriodSlice = createSlice({
  name: "statsPeriod",
  initialState,
  reducers: {
    setStatsScale: (state, action: PayloadAction<StatsScale>) => {
      state.scale = action.payload;
    },
    setStatsHabit: (state, action: PayloadAction<string | null>) => {
      state.habitId = action.payload;
    },
  },
});

export const { setStatsScale, setStatsHabit } = statsPeriodSlice.actions;
export default statsPeriodSlice.reducer;
