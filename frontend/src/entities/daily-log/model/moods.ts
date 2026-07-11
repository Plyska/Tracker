import { Angry, Frown, Meh, Smile, Laugh, type LucideIcon } from "lucide-react";

/** 1–5 → іконка-обличчя + ключ підпису (`mood.scale.*`). Спільне джерело для
 *  пікера настрою (хедер), щоденника та будь-де, де показуємо настрій. */
export interface MoodOption {
  value: number;
  Icon: LucideIcon;
  key: string;
}

export const MOODS: MoodOption[] = [
  { value: 1, Icon: Angry, key: "awful" },
  { value: 2, Icon: Frown, key: "bad" },
  { value: 3, Icon: Meh, key: "okay" },
  { value: 4, Icon: Smile, key: "good" },
  { value: 5, Icon: Laugh, key: "great" },
];

/** Опис настрою за значенням (1–5) або `undefined`, якщо поза шкалою. */
export const moodByValue = (value?: number): MoodOption | undefined =>
  MOODS.find((m) => m.value === value);
