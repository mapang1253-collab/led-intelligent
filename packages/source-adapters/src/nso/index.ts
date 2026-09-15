import type { AcquisitionResult } from "@reis/contracts";
import { type FetchJsonOptions, fetchJson } from "../http.js";
import { type SesIncomeTarget, parseSesIncomeRows } from "./ses-income.js";

/** Operator-configured endpoint. Adapters never accept a user-supplied URL. */
const SES_INCOME_URL = "https://catalogapi.nso.go.th/api/index?table=SFD_SPB0802_66&format=json";

/**
 * Acquires NSO household-income observations for one province.
 *
 * NOTE (docs/implementation-plan.md §4): this adapter is implemented but NOT activated. Before its
 * output may support an active analytical claim it needs the documented source gate — licence and
 * reuse terms, refresh policy, coverage statement and an ACADEMIC_REVIEWED record. Until then it is
 * exercised by tests and ingestion tooling only.
 */
export async function fetchSesIncome(
  target: SesIncomeTarget,
  options: FetchJsonOptions = {},
): Promise<AcquisitionResult> {
  const response = await fetchJson(SES_INCOME_URL, options);
  if (response.outcome !== "SUCCESS") {
    // Retry classification travels with the outcome; the orchestrator, not the adapter, decides
    // whether to try again (docs/performance-and-reliability.md §3).
    return {
      outcome: response.outcome,
      reason: response.reason,
      retryable: response.retryable,
    };
  }
  return parseSesIncomeRows(response.payload, target);
}

export {
  MEASURE_ID as SES_INCOME_MEASURE_ID,
  SOURCE_PRODUCT_ID as SES_INCOME_SOURCE_PRODUCT_ID,
  parseSesIncomeRows,
  type SesIncomeTarget,
} from "./ses-income.js";
