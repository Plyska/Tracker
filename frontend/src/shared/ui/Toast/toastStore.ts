import { useSyncExternalStore } from "react";

/**
 * Ефемерний стор toast'ів поза React/Redux (це не доменні дані). `toast.error(...)` можна
 * кликати звідусіль, включно з не-React кодом (RTK Query middleware). UI — у `Toast.tsx`.
 */

export type ToastVariant = "error" | "success";
export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let items: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

const emit = () => listeners.forEach((l) => l());

function push(message: string, variant: ToastVariant) {
  items = [...items, { id: nextId++, message, variant }];
  emit();
}

export function dismissToast(id: number) {
  items = items.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  error: (message: string) => push(message, "error"),
  success: (message: string) => push(message, "success"),
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
