/**
 * Задача розпорядку дня / списку справ. `startTime` присутній ⇒ елемент розпорядку (рендериться
 * у хронопорядку), відсутній ⇒ елемент списку справ. `habitId` — опційна мітка на навичку.
 */
export interface Task {
  id: string;
  date?: string; // ISO 'YYYY-MM-DD'; відсутня → без дати («Загальна» картка)
  title: string;
  startTime?: string; // 'HH:mm' (локальний, без TZ)
  endTime?: string; // 'HH:mm'
  habitId?: string;
  done: boolean;
  createdAt: string; // ISO 'YYYY-MM-DD'
}
