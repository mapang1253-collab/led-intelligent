export { th, type ThaiCatalog } from "./th.js";

/** MVP locale is fixed — see docs/technology-stack.md §6 (RD-10). No language selector. */
export const DEFAULT_LOCALE = "th-TH" as const;
export const SUPPORTED_LOCALES = ["th-TH"] as const;
