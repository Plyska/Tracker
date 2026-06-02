import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";
import type { Habit, HabitsState } from "./types";

const SEED_HABITS: Habit[] = [
  {
    id: "h1",
    name: "Reading",
    color: "#6d28d9",
    icon: "BookOpen",
    createdAt: "2026-01-01",
  },
  {
    id: "h2",
    name: "Running",
    color: "#059669",
    icon: "Footprints",
    createdAt: "2026-01-01",
  },
  {
    id: "h3",
    name: "Learning English",
    color: "#2563eb",
    icon: "Languages",
    createdAt: "2026-01-01",
  },
  {
    id: "h4",
    name: "Wake up at 8 AM",
    color: "#ea580c",
    icon: "AlarmClock",
    createdAt: "2026-01-01",
  },
  {
    id: "h5",
    name: "Morning workout",
    color: "#db2777",
    icon: "Dumbbell",
    createdAt: "2026-01-01",
  },
];

const initialState: HabitsState = {
  items: SEED_HABITS,
};

type CreateHabitInput = {
  name: string;
  color: string;
  icon?: string | null;
};

const habitsSlice = createSlice({
  name: "habits",
  initialState,
  reducers: {
    addHabit: {
      reducer: (state, action: PayloadAction<Habit>) => {
        state.items.push(action.payload);
      },
      prepare: ({ name, color, icon }: CreateHabitInput) => ({
        payload: {
          id: nanoid(),
          name: name.trim(),
          color,
          icon: icon ?? undefined,
          createdAt: new Date().toISOString().slice(0, 10),
          archived: false,
        } satisfies Habit,
      }),
    },
    renameHabit: (
      state,
      action: PayloadAction<{ id: string; name: string }>,
    ) => {
      const habit = state.items.find((h) => h.id === action.payload.id);
      if (habit) habit.name = action.payload.name.trim();
    },
    setHabitColor: (
      state,
      action: PayloadAction<{ id: string; color: string }>,
    ) => {
      const habit = state.items.find((h) => h.id === action.payload.id);
      if (habit) habit.color = action.payload.color;
    },
    setHabitIcon: (
      state,
      action: PayloadAction<{ id: string; icon: string | null }>,
    ) => {
      const habit = state.items.find((h) => h.id === action.payload.id);
      if (habit) habit.icon = action.payload.icon ?? undefined;
    },
    removeHabit: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter((h) => h.id !== action.payload);
    },
  },
});

export const {
  addHabit,
  renameHabit,
  setHabitColor,
  setHabitIcon,
  removeHabit,
} = habitsSlice.actions;
export default habitsSlice.reducer;
