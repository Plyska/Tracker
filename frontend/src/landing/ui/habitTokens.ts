import {
  Angry,
  BookOpen,
  Droplets,
  Dumbbell,
  Footprints,
  Frown,
  Languages,
  Laugh,
  Meh,
  Music,
  Smile,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CellState } from "./primitives";

/** Демо-навички лендінгу. У застосунку колір/іконка — дані користувача; тут — фіксований набір. */
export type HabitKey = "water" | "read" | "med" | "run" | "gym" | "english" | "guitar";

/** Класи кольору навички — літерали, щоб Tailwind їх побачив (токени --color-habit-* у landing.css). */
export const HABIT_STYLE: Record<HabitKey, { bg: string; border: string; Icon: LucideIcon }> = {
  water: { bg: "bg-habit-water", border: "border-habit-water", Icon: Droplets },
  read: { bg: "bg-habit-read", border: "border-habit-read", Icon: BookOpen },
  med: { bg: "bg-habit-med", border: "border-habit-med", Icon: Sparkles },
  run: { bg: "bg-habit-run", border: "border-habit-run", Icon: Footprints },
  gym: { bg: "bg-habit-gym", border: "border-habit-gym", Icon: Dumbbell },
  english: { bg: "bg-habit-english", border: "border-habit-english", Icon: Languages },
  guitar: { bg: "bg-habit-guitar", border: "border-habit-guitar", Icon: Music },
};

/** Обличчя настрою 1–5 — ті самі lucide-іконки, що в `MOODS` застосунку. */
export const MOOD_ICONS: LucideIcon[] = [Angry, Frown, Meh, Smile, Laugh];

/** Додає локалізований суфікс хвилин до time-клітинки («45» → «45m» / «45хв»); решту станів не чіпає. */
export const withMinutes = (state: CellState, unit: string): CellState =>
  state.kind === "time" ? { kind: "time", label: `${state.label}${unit}` } : state;
