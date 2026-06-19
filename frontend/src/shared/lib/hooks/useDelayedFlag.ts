import { useEffect, useState } from "react";

/**
 * Повертає `true`, лише якщо `active` тримається довше за `delay` (мс). Гасить мерехтіння
 * лоадерів на швидких відповідях: коротка операція завершиться раніше за поріг і скелетон
 * не зʼявиться. Скидається миттєво, щойно `active` стає `false`.
 */
export function useDelayedFlag(active: boolean, delay = 150): boolean {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!active) return;
    // setState — лише в таймері та cleanup (не синхронно в тілі ефекту): cleanup при
    // переході active→false (або розмонтуванні) скидає прапор назад.
    const id = setTimeout(() => setShown(true), delay);
    return () => {
      clearTimeout(id);
      setShown(false);
    };
  }, [active, delay]);

  return shown;
}
