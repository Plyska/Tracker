import { ACCENT_COLORS, ACCENT_KEYS, type AccentKey } from "@/shared/config/accents";

export { DEFAULT_ACCENT, type AccentKey } from "@/shared/config/accents";

export interface AccentOption {
  key: AccentKey;
  /** `--primary` світлої теми — свотч у Settings. */
  swatch: string;
}

export const ACCENTS: AccentOption[] = ACCENT_KEYS.map((key) => ({
  key,
  swatch: ACCENT_COLORS[key].light,
}));
