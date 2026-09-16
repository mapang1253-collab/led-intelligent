import type { ModelClient, ModelResponse } from "@reis/ai-gateway";
import { type BudgetLimits, type Db, recordCall, reserveCall } from "@reis/data-access";

/**
 * Wraps the provider client in the project's quota budget (docs/ai-architecture.md §5).
 *
 * Capacity is reserved before the request leaves, so an exhausted allowance is discovered here
 * rather than as a 429 from the provider — and a run that cannot call says so with a stable reason
 * code instead of failing mid-flight. Every outcome is recorded, counts only: the log holds no
 * prompt, no response and nothing a user or a source supplied.
 */

export const PROVIDER = "google-ai-studio";

export function readBudgetLimits(env: {
  GEMINI_RPM_LIMIT?: string;
  GEMINI_TPM_LIMIT?: string;
  GEMINI_RPD_LIMIT?: string;
  AI_DAILY_RESERVE_PERCENT?: string;
}): BudgetLimits | null {
  const rpm = Number(env.GEMINI_RPM_LIMIT);
  const tpm = Number(env.GEMINI_TPM_LIMIT);
  const rpd = Number(env.GEMINI_RPD_LIMIT);
  // An unrecorded limit is not treated as "unlimited": without the numbers the budget cannot be
  // enforced, and a live call would be spending an allowance nobody measured.
  if (![rpm, tpm, rpd].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  const reserve = Number(env.AI_DAILY_RESERVE_PERCENT);
  return {
    rpm,
    tpm,
    rpd,
    dailyReservePercent: Number.isFinite(reserve) ? reserve : 20,
  };
}

/** Parses the reset instant a provider supplies, whether as seconds or as a date. */
export function parseRetryAfter(value: string | null, now: Date): string | null {
  if (!value) {
    return null;
  }
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return new Date(now.getTime() + seconds * 1000).toISOString();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/** Pulls a retry hint out of a provider message without letting the message itself escape. */
function retryHint(detail: string, now: Date): string | null {
  const match = /retry(?:-| )after[": ]+([0-9]+)/i.exec(detail);
  return match ? parseRetryAfter(match[1] as string, now) : null;
}

export function budgetedClient(
  db: Db,
  model: string,
  limits: BudgetLimits,
  inner: ModelClient,
): ModelClient {
  return async (call) => {
    const decision = await reserveCall(db, PROVIDER, model, limits);
    if (!decision.allowed) {
      await recordCall(db, PROVIDER, model, {
        outcome: decision.reason,
        inputTokens: null,
        outputTokens: null,
        latencyMs: null,
        retryAfter: decision.retry_after,
      });
      const response: ModelResponse = {
        outcome: "FAILED",
        code: decision.reason === "PROVIDER_BLOCKED" ? "AI_QUOTA_EXHAUSTED" : "AI_QUOTA_EXHAUSTED",
        detail: decision.reason,
        // Never retried automatically: the window belongs to the project, not to this request.
        retryable: false,
      };
      return response;
    }

    const startedAt = Date.now();
    const result = await inner(call);
    const latencyMs = Date.now() - startedAt;
    const now = new Date();

    await recordCall(db, PROVIDER, model, {
      outcome: result.outcome === "SUCCESS" ? "SUCCESS" : result.code,
      inputTokens: null,
      outputTokens: null,
      latencyMs,
      retryAfter:
        result.outcome === "FAILED" && result.code === "AI_QUOTA_EXHAUSTED"
          ? (retryHint(result.detail, now) ?? new Date(now.getTime() + 60_000).toISOString())
          : null,
    });

    return result;
  };
}
