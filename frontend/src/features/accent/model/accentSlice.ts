import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_ACCENT, type AccentKey } from "./accents";

type AccentState = { value: AccentKey };

const initialState: AccentState = {
  value: DEFAULT_ACCENT,
};

const accentSlice = createSlice({
  name: "accent",
  initialState,
  reducers: {
    setAccent: (state, action: PayloadAction<AccentKey>) => {
      state.value = action.payload;
    },
  },
});

export const { setAccent } = accentSlice.actions;
export default accentSlice.reducer;
