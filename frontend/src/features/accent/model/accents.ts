export type AccentKey = "violet" | "emerald" | "blue" | "orange";

export interface AccentOption {
  key: AccentKey;
  swatch: string;
}

export const ACCENTS: AccentOption[] = [
  { key: "violet", swatch: "#6d28d9" },
  { key: "emerald", swatch: "#059669" },
  { key: "blue", swatch: "#2563eb" },
  { key: "orange", swatch: "#ea580c" },
];

export const DEFAULT_ACCENT: AccentKey = "violet";
