import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { entryKey, getWeekDays, isFutureDay, toISODate } from "@/shared/lib";
import type { HabitEntry } from "./types";

/**
 * Розріджене сховище відміток (session-only), ключ — `habitId_date`.
 * `toggle` — upsert клітинки (відповідник PUT /entries, §5.3): прибираємо
 * запис, коли `done: false`, щоб сховище лишалось розрідженим.
 */
interface EntriesState {
  byKey: Record<string, HabitEntry>;
}

/** Сід: відмічаємо частину навичок на днях поточного тижня до сьогодні включно. */
function buildSeedEntries(): Record<string, HabitEntry> {
  // Індекси днів тижня (0 = Пн … 6 = Нд), які вважаємо виконаними для навички.
  const pattern: Record<string, number[]> = {
    h1: [0, 1, 2, 3], // Reading
    h2: [0, 2, 4], // Running
    h3: [0, 1, 2, 3, 4], // Learning English
    h4: [1, 3], // Wake up at 8 AM
    h5: [0, 2], // Morning workout
  };

  const week = getWeekDays(new Date());
  const byKey: Record<string, HabitEntry> = {};

  for (const [habitId, days] of Object.entries(pattern)) {
    for (const dayIndex of days) {
      const day = week[dayIndex];
      if (isFutureDay(day)) continue;
      const date = toISODate(day);
      byKey[entryKey(habitId, date)] = { habitId, date, done: true };
    }
  }

  return byKey;
}

const initialState: EntriesState = {
  byKey: buildSeedEntries(),
};

const entriesSlice = createSlice({
  name: "entries",
  initialState,
  reducers: {
    toggleEntry: (state, action: PayloadAction<HabitEntry>) => {
      const { habitId, date, done } = action.payload;
      const key = entryKey(habitId, date);
      if (done) {
        state.byKey[key] = { habitId, date, done: true };
      } else {
        delete state.byKey[key];
      }
    },
    /** Каскад: прибрати всі відмітки навички (при її видаленні, §5.2). */
    clearHabitEntries: (state, action: PayloadAction<string>) => {
      for (const key of Object.keys(state.byKey)) {
        if (state.byKey[key].habitId === action.payload)
          delete state.byKey[key];
      }
    },
  },
});

export const { toggleEntry, clearHabitEntries } = entriesSlice.actions;
export default entriesSlice.reducer;
