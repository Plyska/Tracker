import { Circle } from "lucide-react";
import { HABIT_ICONS } from "../lib/habitIcons";

interface HabitIconProps {
  name?: string;
  className?: string;
}

export function HabitIcon({ name, className }: HabitIconProps) {
  const Icon = (name && HABIT_ICONS[name]) || Circle;
  return <Icon className={className} aria-hidden />;
}
