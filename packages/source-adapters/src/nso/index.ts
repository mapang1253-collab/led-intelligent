import type { AcquisitionResult } from "@reis/contracts";
import { type FetchJsonOptions, type FetchJsonResult, fetchJson } from "../http.js";
import { type SesIncomeTarget, parseSesIncomeRows } from "./ses-income.js";

/** Operator-configured endpoint. Adapters never accept a user-supplied URL. */
export const SES_INCOME_URL =
  "https://catalogapi.nso.go.th/api/index?table=SFD_SPB0802_66&format=json";

/**
 * Acquires the whole published table once.
 *
 * The table is nationwide and ~10MB, so bulk ingestion fetches it a single time and parses each
 * province from that one payload; fetching per province would re-download the same 10MB 77 times
 * for no extra information (docs/technology-stack.md §15: bulk ingestion stays off the interactive
 * path). Callers must raise `timeoutMs` above the default — the live table takes ~18s to transfer.
 */
export function fetchSesIncomeTable(options: FetchJsonOptions = {}): Promise<FetchJsonResult> {
  return fetchJson(SES_INCOME_URL, options);
}

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
  const response = await fetchSesIncomeTable(options);
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
