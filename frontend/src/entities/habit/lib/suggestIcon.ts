/**
 * Auto-suggest іконки за назвою навички. Спільний механізм для всіх тарифів
 * (CLAUDE.md §5.7): дає Free авто-іконку, пре-філить picker у Pro.
 *
 * Працює як пошук підрядка-стему (en + uk) у нормалізованій назві. Порядок
 * у списку = пріоритет: специфічніші стеми йдуть перед загальними
 * (напр. «сонц»→Sun перед «сон»→Bed, щоб «Загорати на сонці» дало сонце).
 * Назва іконки мусить існувати в HABIT_ICONS.
 */
const RULES: ReadonlyArray<readonly [icon: string, stems: readonly string[]]> = [
  ["BookOpen", ["read", "book", "чита", "книг"]],
  ["Languages", ["english", "language", "англійськ", "мов"]],
  ["GraduationCap", ["study", "learn", "course", "lesson", "навч", "вчити", "курс", "урок"]],
  ["Footprints", ["run", "jog", "walk", "step", "біг", "крок", "ходь", "прогул"]],
  ["Bike", ["bike", "cycl", "велосипед"]],
  ["Dumbbell", ["workout", "gym", "exercise", "fitness", "lift", "тренув", "зал", "качал", "вправ"]],
  ["Activity", ["yoga", "stretch", "pilates", "йог", "розтяж", "пілатес"]],
  ["AlarmClock", ["wake", "alarm", "early", "прокид", "будильник", "рано"]],
  ["Sun", ["sun", "tan", "загор", "сонц"]],
  ["Bed", ["sleep", "nap", "rest", "спат", "сон", "відпоч"]],
  ["Droplet", ["water", "drink", "hydrat", "вод", "пити"]],
  ["Brain", ["meditat", "mindful", "breath", "медитац", "усвідомл", "дихан"]],
  ["Code", ["code", "program", "develop", "leetcode", "програм", "кодит"]],
  ["Music", ["music", "guitar", "piano", "sing", "музик", "гітар", "піанін", "спів"]],
  ["Heart", ["health", "heart", "здоров", "серц"]],
  ["Apple", ["diet", "eat", "fruit", "veg", "nutrition", "харч", "їсти", "фрукт", "дієт", "овоч"]],
  ["Coffee", ["coffee", "tea", "кав", "чай"]],
  ["Pencil", ["writ", "journal", "diary", "note", "нотат", "щоденник", "писати", "запис"]],
  ["Palette", ["draw", "paint", "art", "design", "малюв", "мистецтв", "фарб", "дизайн"]],
  ["Leaf", ["nature", "outdoor", "garden", "природ", "парк", "сад"]],
  ["PiggyBank", ["money", "save", "budget", "finance", "грош", "заощад", "бюджет", "фінанс"]],
  ["Smartphone", ["phone", "screen", "social", "телефон", "екран", "соцмереж"]],
  ["Sparkles", ["skin", "beauty", "care", "догляд", "шкір", "краса"]],
];

export function resolveHabitIcon(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  for (const [icon, stems] of RULES) {
    if (stems.some((stem) => normalized.includes(stem))) return icon;
  }
  return null;
}
