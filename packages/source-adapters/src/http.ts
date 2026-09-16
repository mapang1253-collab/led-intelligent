import type { AcquisitionOutcome } from "@reis/contracts";

/**
 * Shared HTTP access for source adapters. Adapters may only call operator-configured hosts with a
 * normalized acquisition key — never a user-supplied URL (docs/security-privacy-compliance.md §4).
 *
 * Two things are deliberately kept separate, per docs/api-contracts.md §5: the *outcome* (what the
 * source said) and the *retry classification* (whether trying again could help). A 503 and a
 * malformed payload both mean "no usable data now", but retrying one is correct and retrying the
 * other just hides schema drift from the operator who needs to see it. Nothing here retries; that
 * is the orchestrator's decision (docs/performance-and-reliability.md §3).
 */

/** Identifies this application to source owners, as their usage policies expect. */
export const USER_AGENT = "reis-academic/0.1 (Thailand HBU university project)";

const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Default response ceiling. The largest source currently in scope (the NSO SES table) is ~9.4MB,
 * so 32MB leaves room to grow while still bounding a Worker isolate's memory
 * (docs/security-privacy-compliance.md §4 requires adapters to enforce response size limits).
 */
const DEFAULT_MAX_BYTES = 32 * 1024 * 1024;

export type FetchTextResult =
  | { readonly outcome: "SUCCESS"; readonly text: string }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS" | "OUTSIDE_COVERAGE">;
      readonly reason: string;
      readonly retryable: boolean;
    };

export type FetchJsonResult =
  | { readonly outcome: "SUCCESS"; readonly payload: unknown }
  | {
      readonly outcome: Exclude<AcquisitionOutcome, "SUCCESS" | "OUTSIDE_COVERAGE">;
      readonly reason: string;
      readonly retryable: boolean;
    };

export interface FetchJsonOptions {
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  /** Injected in tests; defaults to the platform fetch. */
  readonly fetchImpl?: typeof fetch;
}

type FetchJsonFailure = Exclude<FetchJsonResult, { outcome: "SUCCESS" }>;

function failure(
  outcome: FetchJsonFailure["outcome"],
  reason: string,
  retryable: boolean,
): FetchJsonFailure {
  return { outcome, reason, retryable };
}

function classifyStatus(status: number): FetchJsonFailure | null {
  if (status === 404) {
    return failure("NO_RECORD", "source returned 404", false);
  }
  if (status === 429) {
    // Retryable, but only after the orchestrator honours the source's own backoff window.
    return failure("RATE_LIMITED", "source returned 429", true);
  }
  if (status === 401 || status === 403) {
    return failure("ACCESS_DENIED", `source returned ${status}`, false);
  }
  if (status >= 500) {
    return failure("INVALID_RESPONSE", `source returned ${status}`, true);
  }
  if (status >= 400) {
    return failure("INVALID_RESPONSE", `source returned ${status}`, false);
  }
  return null;
}

/** Reads the body, refusing to buffer more than `maxBytes`. */
async function readBounded(response: Response, maxBytes: number): Promise<string | null> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return null;
  }

  const body = response.body;
  if (!body) {
    const text = await response.text();
    return new TextEncoder().encode(text).byteLength > maxBytes ? null : text;
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

/**
 * Acquires a text body under the same status, size and retry rules as `fetchJson`.
 *
 * Not every authoritative publisher serves JSON: DOPA publishes pipe-delimited text files. The
 * transport rules do not change with the payload format, so the two share everything but parsing.
 */
export async function fetchText(
  url: string,
  options: FetchJsonOptions = {},
): Promise<FetchTextResult> {
  const result = await fetchBody(url, options, "text/plain, */*");
  if (result.outcome !== "SUCCESS") {
    return result;
  }
  return { outcome: "SUCCESS", text: result.text };
}

export async function fetchJson(
  url: string,
  options: FetchJsonOptions = {},
): Promise<FetchJsonResult> {
  const result = await fetchBody(url, options, "application/json");
  if (result.outcome !== "SUCCESS") {
    return result;
  }
  try {
    return { outcome: "SUCCESS", payload: JSON.parse(result.text) };
  } catch {
    return failure("INVALID_RESPONSE", "response body was not valid JSON", false);
  }
}

async function fetchBody(
  url: string,
  options: FetchJsonOptions,
  accept: string,
): Promise<FetchTextResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      headers: { "User-Agent": USER_AGENT, Accept: accept },
      signal: controller.signal,
    });

    const statusFailure = classifyStatus(response.status);
    if (statusFailure) {
      return statusFailure;
    }

    const text = await readBounded(response, maxBytes);
    if (text === null) {
      return failure(
        "INVALID_RESPONSE",
        `response body exceeded the ${maxBytes}-byte limit`,
        false,
      );
    }

    return { outcome: "SUCCESS", text };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return failure("TIMEOUT", "request exceeded its deadline", true);
    }
    // DNS failure, connection reset, TLS error: the source may well answer on the next attempt.
    return failure(
      "INVALID_RESPONSE",
      error instanceof Error ? error.message : "unknown transport failure",
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}
