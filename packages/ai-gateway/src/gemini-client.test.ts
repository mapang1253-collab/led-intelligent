import { describe, expect, it } from "vitest";
import { classifyProviderError } from "./gemini-client.js";

/**
 * A 429 is two different facts wearing the same number. Saying the day's quota is gone when the
 * limit refills in a minute tells the reader to come back tomorrow for no reason.
 */

describe("classifyProviderError", () => {
  it("calls a per-day quota what it is", () => {
    const perDay = classifyProviderError(
      Object.assign(
        new Error("Quota exceeded for quota metric 'GenerateRequestsPerDayPerProject'"),
        {
          status: 429,
        },
      ),
    );
    expect(perDay.outcome === "FAILED" && perDay.code).toBe("AI_QUOTA_EXHAUSTED");
  });

  it("treats a per-minute limit as a rate limit, not a spent day", () => {
    const perMinute = classifyProviderError(
      Object.assign(new Error("Quota exceeded for quota metric 'GenerateRequestsPerMinute'"), {
        status: 429,
      }),
    );
    expect(perMinute.outcome === "FAILED" && perMinute.code).toBe("AI_RATE_LIMITED");
  });

  it("does not guess the day is over from a bare 429", () => {
    const bare = classifyProviderError(
      Object.assign(new Error("Too Many Requests"), { status: 429 }),
    );
    expect(bare.outcome === "FAILED" && bare.code).toBe("AI_RATE_LIMITED");
  });

  it("still separates an overloaded provider from a limited one", () => {
    const busy = classifyProviderError(
      Object.assign(new Error("model is overloaded"), { status: 503 }),
    );
    expect(busy.outcome === "FAILED" && busy.code).toBe("AI_PROVIDER_BUSY");
  });

  it("keeps a rejected key unretryable", () => {
    const denied = classifyProviderError(
      Object.assign(new Error("API key not valid"), { status: 403 }),
    );
    expect(denied.outcome === "FAILED" && denied.code).toBe("AI_UNAVAILABLE");
    expect(denied.outcome === "FAILED" && denied.retryable).toBe(false);
  });
});
