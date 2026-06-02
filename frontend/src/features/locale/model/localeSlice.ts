import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { DEFAULT_LOCALE, type Locale } from "@/shared/config/i18n";

type LocaleState = { value: Locale };

const initialState: LocaleState = {
  value: DEFAULT_LOCALE,
};

const localeSlice = createSlice({
  name: "locale",
  initialState,
  reducers: {
    setLocale: (state, action: PayloadAction<Locale>) => {
      state.value = action.payload;
    },
  },
});

export const { setLocale } = localeSlice.actions;
export default localeSlice.reducer;
