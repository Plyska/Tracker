import type { Locale } from "../i18n";
import { PRIVACY } from "./privacy";
import { TERMS } from "./terms";
import type { LegalDoc, LegalDocKind } from "./types";

export { LegalPage } from "./LegalPage";
export type { LegalDoc, LegalDocKind } from "./types";

/** Усі документи за видом і мовою — єдина точка для `LandingApp` і SEO-шапки. */
export const LEGAL_DOCS: Record<LegalDocKind, Record<Locale, LegalDoc>> = {
  privacy: PRIVACY,
  terms: TERMS,
};
