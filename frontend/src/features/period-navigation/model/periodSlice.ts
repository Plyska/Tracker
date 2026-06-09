import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { shiftAnchor, todayISODate } from "@/shared/lib";

export type Scale = "week" | "month";

type PeriodState = {
  /** Опорна дата періоду, що переглядається (ISO 'YYYY-MM-DD'). */
  anchor: string;
  /** Масштаб таблиці. Рендер Month — окремий крок Фази 5. */
  scale: Scale;
};

// Session-only: стартуємо від «сьогодні», при перезавантаженні скидається (не персиститься).
const initialState: PeriodState = {
  anchor: todayISODate(),
  scale: "week",
};

const periodSlice = createSlice({
  name: "period",
  initialState,
  reducers: {
    prevPeriod: (state) => {
      state.anchor = shiftAnchor(state.anchor, state.scale, -1);
    },
    nextPeriod: (state) => {
      state.anchor = shiftAnchor(state.anchor, state.scale, 1);
    },
    goToToday: (state) => {
      state.anchor = todayISODate();
    },
    setScale: (state, action: PayloadAction<Scale>) => {
      state.scale = action.payload;
    },
  },
});

export const { prevPeriod, nextPeriod, goToToday, setScale } =
  periodSlice.actions;
export default periodSlice.reducer;
