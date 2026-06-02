import {
  Activity,
  AlarmClock,
  Apple,
  Bed,
  Bike,
  BookOpen,
  Brain,
  Code,
  Coffee,
  Droplet,
  Dumbbell,
  Footprints,
  GraduationCap,
  Heart,
  Languages,
  Leaf,
  Music,
  Palette,
  Pencil,
  PiggyBank,
  Smartphone,
  Sparkles,
  Sun,
  type LucideIcon,
} from "lucide-react";

/**
 * Реєстр доступних іконок навичок (lucide). Явний мапінг, а не динамічний
 * імпорт усієї бібліотеки — передбачуваний bundle. Це ж — джерело для icon
 * picker'а (Pro) і для auto-suggest (резолв за назвою, див. suggestIcon.ts).
 */
export const HABIT_ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Footprints,
  Languages,
  AlarmClock,
  Dumbbell,
  Sun,
  Bed,
  Droplet,
  Brain,
  Code,
  Music,
  Heart,
  Apple,
  Bike,
  Pencil,
  Palette,
  Leaf,
  GraduationCap,
  PiggyBank,
  Smartphone,
  Coffee,
  Sparkles,
  Activity,
};

export const HABIT_ICON_NAMES = Object.keys(HABIT_ICONS);
