import { type Task } from "@/entities/task";

/** Порядок у межах картки: невиконані зверху, виконані — вниз; далі за часом / createdAt. */
export const byDisplay = (a: Task, b: Task): number => {
  if (!!a.done !== !!b.done) return a.done ? 1 : -1;
  if (a.startTime && b.startTime) return a.startTime.localeCompare(b.startTime);
  if (a.startTime) return -1;
  if (b.startTime) return 1;
  return a.createdAt.localeCompare(b.createdAt);
};
