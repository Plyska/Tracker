import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * `false` під час SSR і першого (гідраційного) рендеру, `true` після — без setState в ефекті.
 * Потрібен там, де скрол-анімація має «озброїтись» лише на клієнті, а пререндерений HTML —
 * лишатися повністю видимим.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
