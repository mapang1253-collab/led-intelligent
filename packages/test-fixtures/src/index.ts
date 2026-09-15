/**
 * @reis/test-fixtures — versioned representative fixtures for contract-conformance and domain
 * tests (docs/implementation-plan.md §3): admin-area cases, source-adapter response fixtures,
 * AI evaluation cases, and the golden model/scenario cases required before activation.
 */
import nsoSesIncomeSample from "./nso/ses-income-sample.json" with { type: "json" };

/**
 * Real rows captured from the NSO SES table `SFD_SPB0802_66` on 2026-09-15 (Bangkok + Chon Buri,
 * both published years, plus three non-total breakdown rows so parsers must prove they exclude
 * them). Captured verbatim — do not hand-edit values.
 */
export { nsoSesIncomeSample };
