import { sql } from "kysely";
import type { Db } from "../connection.js";

/**
 * AI quota reservation (docs/ai-architecture.md §5).
 *
 * The reservation is a single atomic statement: increment the window's counter only if it is still
 * under the limit, and return the new value. If two runs race for the last call of the day, exactly
 * one gets a row back. Checking first and incrementing after would let both through.
 *
 * A reservation is never released. A request that reached the provider consumed allowance whatever
 * it returned, so refunding a failed call would let a failing loop spend the day's budget twice.
 */

export interface BudgetLimits {
  /** Requests per minute, as recorded from the provider's console. */
  readonly rpm: number;
  /** Tokens per minute (input). */
  readonly tpm: number;
  /** Requests per day. */
  readonly rpd: number;
  /** Share of the daily allowance held back, so a run never consumes the project's last request. */
  readonly dailyReservePercent: number;
}

export type BudgetDecision =
  | {
      readonly allowed: true;
      readonly remaining_today: number;
      readonly remaining_this_minute: number;
    }
  | {
      readonly allowed: false;
      readonly reason: "RPD_EXHAUSTED" | "RPM_EXHAUSTED" | "TPM_EXHAUSTED" | "PROVIDER_BLOCKED";
      readonly retry_after: string | null;
      readonly remaining_today: number;
    };

/** The effective daily ceiling after the reserve is held back. */
export function effectiveDailyLimit(limits: BudgetLimits): number {
  const reserve = Math.ceil((limits.rpd * limits.dailyReservePercent) / 100);
  return Math.max(0, limits.rpd - reserve);
}

interface WindowRow {
  requests_reserved: number;
  tokens_used: string | number;
  blocked_until: string | null;
}

async function currentWindow(
  db: Db,
  provider: string,
  model: string,
  kind: "MINUTE" | "DAY",
): Promise<WindowRow | undefined> {
  const row = await db
    .selectFrom("operations.ai_budget_window")
    .select(["requests_reserved", "tokens_used", "blocked_until"])
    .where("provider", "=", provider)
    .where("model", "=", model)
    .where("window_kind", "=", kind)
    .where(
      "window_start",
      "=",
      sql<string>`date_trunc(${kind === "MINUTE" ? "minute" : "day"}, now())`,
    )
    .executeTakeFirst();
  return row as WindowRow | undefined;
}

/**
 * Reserves one request against both windows, enforcing the lower remaining bound.
 *
 * The day window is claimed first: exhausting the minute is a short wait, but a day reservation
 * taken and then abandoned is gone until the provider's reset.
 */
export async function reserveCall(
  db: Db,
  provider: string,
  model: string,
  limits: BudgetLimits,
): Promise<BudgetDecision> {
  const dayLimit = effectiveDailyLimit(limits);

  const blocked = await currentWindow(db, provider, model, "DAY");
  if (blocked?.blocked_until && new Date(blocked.blocked_until) > new Date()) {
    // The provider told us to stop; we stop until it says otherwise rather than probing.
    return {
      allowed: false,
      reason: "PROVIDER_BLOCKED",
      retry_after: blocked.blocked_until,
      remaining_today: Math.max(0, dayLimit - blocked.requests_reserved),
    };
  }
  if (blocked && Number(blocked.tokens_used) >= limits.tpm * 60 * 24) {
    return {
      allowed: false,
      reason: "TPM_EXHAUSTED",
      retry_after: null,
      remaining_today: Math.max(0, dayLimit - blocked.requests_reserved),
    };
  }

  const day = await claim(db, provider, model, "DAY", dayLimit);
  if (day === null) {
    return { allowed: false, reason: "RPD_EXHAUSTED", retry_after: null, remaining_today: 0 };
  }

  const minute = await claim(db, provider, model, "MINUTE", limits.rpm);
  if (minute === null) {
    // The day reservation stands: it was genuinely taken, and pretending otherwise would let a
    // caller retry past the daily ceiling by failing the minute check repeatedly.
    return {
      allowed: false,
      reason: "RPM_EXHAUSTED",
      retry_after: null,
      remaining_today: Math.max(0, dayLimit - day),
    };
  }

  return {
    allowed: true,
    remaining_today: Math.max(0, dayLimit - day),
    remaining_this_minute: Math.max(0, limits.rpm - minute),
  };
}

/** Atomic compare-and-increment; null means the window is already at its limit. */
async function claim(
  db: Db,
  provider: string,
  model: string,
  kind: "MINUTE" | "DAY",
  limit: number,
): Promise<number | null> {
  if (limit <= 0) {
    return null;
  }
  const unit = kind === "MINUTE" ? "minute" : "day";
  const result = await sql<{ requests_reserved: number }>`
    INSERT INTO operations.ai_budget_window
      (provider, model, window_kind, window_start, requests_reserved)
    VALUES (${provider}, ${model}, ${kind}, date_trunc(${sql.lit(unit)}, now()), 1)
    ON CONFLICT (provider, model, window_kind, window_start) DO UPDATE
      SET requests_reserved = operations.ai_budget_window.requests_reserved + 1,
          updated_at = now()
      WHERE operations.ai_budget_window.requests_reserved < ${limit}
    RETURNING requests_reserved
  `.execute(db);

  const row = result.rows[0];
  return row ? Number(row.requests_reserved) : null;
}

export interface CallRecord {
  readonly outcome: string;
  readonly inputTokens: number | null;
  readonly outputTokens: number | null;
  readonly latencyMs: number | null;
  /** From the provider's own Retry-After or reset field, when it supplied one. */
  readonly retryAfter: string | null;
}

/** Records the outcome and reconciles token use against the day's window. */
export async function recordCall(
  db: Db,
  provider: string,
  model: string,
  record: CallRecord,
): Promise<void> {
  await db
    .insertInto("operations.ai_call_log")
    .values({
      provider,
      model,
      outcome: record.outcome,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      latency_ms: record.latencyMs,
      retry_after_at: record.retryAfter,
    })
    .execute();

  const tokens = (record.inputTokens ?? 0) + (record.outputTokens ?? 0);
  if (tokens === 0 && record.retryAfter === null) {
    return;
  }
  await sql`
    UPDATE operations.ai_budget_window
       SET tokens_used = tokens_used + ${tokens},
           blocked_until = COALESCE(${record.retryAfter}::timestamptz, blocked_until),
           updated_at = now()
     WHERE provider = ${provider} AND model = ${model}
       AND window_kind = 'DAY' AND window_start = date_trunc('day', now())
  `.execute(db);
}

export interface BudgetStatus {
  readonly requests_today: number;
  readonly tokens_today: number;
  readonly blocked_until: string | null;
  readonly effective_daily_limit: number;
  readonly remaining_today: number;
}

/** What the project has spent today — the basis for answering "how many calls do we get?". */
export async function budgetStatus(
  db: Db,
  provider: string,
  model: string,
  limits: BudgetLimits,
): Promise<BudgetStatus> {
  const row = await currentWindow(db, provider, model, "DAY");
  const used = row?.requests_reserved ?? 0;
  const limit = effectiveDailyLimit(limits);
  return {
    requests_today: used,
    tokens_today: Number(row?.tokens_used ?? 0),
    blocked_until: row?.blocked_until ?? null,
    effective_daily_limit: limit,
    remaining_today: Math.max(0, limit - used),
  };
}
