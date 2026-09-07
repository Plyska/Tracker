import { useSyncExternalStore } from "react";

/**
 * Ефемерний стор toast'ів поза React/Redux (це не доменні дані). `toast.error(...)` можна
 * кликати звідусіль, включно з не-React кодом (RTK Query middleware). UI — у `Toast.tsx`.
 */

export type ToastVariant = "error" | "success";

/** Опційна дія в тості — для undo-патерну («Приховано · Повернути»). */
export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  action?: ToastAction;
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

const emit = () => listeners.forEach((l) => l());

function push(message: string, variant: ToastVariant, action?: ToastAction) {
  items = [...items, { id: nextId++, message, variant, action }];
  emit();
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error: (message: string, action?: ToastAction) => push(message, "error", action),
  success: (message: string, action?: ToastAction) => push(message, "success", action),
};

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => items,
    () => items,
  );
}
