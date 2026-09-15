import { describe, expect, it, vi } from "vitest";
import { fetchJson } from "./http.js";

const url = "https://example.invalid/data.json";

describe("fetchJson", () => {
  it("returns parsed JSON on success", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ a: 1 }]), { status: 200 }));

    const result = await fetchJson(url, { fetchImpl });

    expect(result).toEqual({ outcome: "SUCCESS", payload: [{ a: 1 }] });
  });

  it("sends an identifying User-Agent so the source can attribute and rate-limit us", async () => {
    const fetchImpl = vi.fn(
      async (..._args: Parameters<typeof fetch>) => new Response("[]", { status: 200 }),
    );

    await fetchJson(url, { fetchImpl });

    const headers = new Headers(fetchImpl.mock.calls[0]?.[1]?.headers);
    expect(headers.get("user-agent")).toContain("reis");
  });

  it("classifies 429 as RATE_LIMITED, not a generic failure", async () => {
    const fetchImpl = vi.fn(async () => new Response("slow down", { status: 429 }));

    const result = await fetchJson(url, { fetchImpl });

    expect(result.outcome).toBe("RATE_LIMITED");
  });

  it("classifies 401/403 as ACCESS_DENIED", async () => {
    for (const status of [401, 403]) {
      const fetchImpl = vi.fn(async () => new Response("nope", { status }));

      const result = await fetchJson(url, { fetchImpl });

      expect(result.outcome).toBe("ACCESS_DENIED");
    }
  });

  it("classifies 404 as NO_RECORD rather than an error", async () => {
    const fetchImpl = vi.fn(async () => new Response("missing", { status: 404 }));

    const result = await fetchJson(url, { fetchImpl });

    expect(result.outcome).toBe("NO_RECORD");
  });

  it("classifies an aborted request as TIMEOUT", async () => {
    const fetchImpl = vi.fn(async () => {
      throw Object.assign(new Error("aborted"), { name: "AbortError" });
    });

    const result = await fetchJson(url, { fetchImpl });

    expect(result.outcome).toBe("TIMEOUT");
  });

  it("classifies unparseable JSON as INVALID_RESPONSE", async () => {
    const fetchImpl = vi.fn(async () => new Response("<html>not json</html>", { status: 200 }));

    const result = await fetchJson(url, { fetchImpl });

    expect(result.outcome).toBe("INVALID_RESPONSE");
  });

  describe("retry classification", () => {
    it("marks a 5xx as retryable so a maintenance window is not treated as schema drift", async () => {
      const fetchImpl = vi.fn(async () => new Response("maintenance", { status: 503 }));

      const result = await fetchJson(url, { fetchImpl });

      expect(result).toMatchObject({ retryable: true });
    });

    it("marks a transport failure as retryable", async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError("fetch failed: ECONNRESET");
      });

      const result = await fetchJson(url, { fetchImpl });

      expect(result).toMatchObject({ retryable: true });
    });

    it("marks a timeout as retryable", async () => {
      const fetchImpl = vi.fn(async () => {
        throw Object.assign(new Error("aborted"), { name: "AbortError" });
      });

      const result = await fetchJson(url, { fetchImpl });

      expect(result).toMatchObject({ outcome: "TIMEOUT", retryable: true });
    });

    it("marks a malformed payload as NOT retryable — retrying cannot fix schema drift", async () => {
      const fetchImpl = vi.fn(async () => new Response("<html>not json</html>", { status: 200 }));

      const result = await fetchJson(url, { fetchImpl });

      expect(result).toMatchObject({ outcome: "INVALID_RESPONSE", retryable: false });
    });

    it("marks an access denial as NOT retryable", async () => {
      const fetchImpl = vi.fn(async () => new Response("nope", { status: 403 }));

      const result = await fetchJson(url, { fetchImpl });

      expect(result).toMatchObject({ outcome: "ACCESS_DENIED", retryable: false });
    });
  });

  describe("response size cap", () => {
    it("rejects a body whose declared content-length exceeds the cap", async () => {
      const fetchImpl = vi.fn(
        async () => new Response("[]", { status: 200, headers: { "content-length": "999999999" } }),
      );

      const result = await fetchJson(url, { fetchImpl, maxBytes: 1024 });

      expect(result).toMatchObject({ outcome: "INVALID_RESPONSE", retryable: false });
    });

    it("rejects an undeclared body that grows past the cap while streaming", async () => {
      const oversized = JSON.stringify(Array.from({ length: 5000 }, (_, i) => ({ i })));
      const fetchImpl = vi.fn(async () => new Response(oversized, { status: 200 }));

      const result = await fetchJson(url, { fetchImpl, maxBytes: 128 });

      expect(result.outcome).toBe("INVALID_RESPONSE");
    });

    it("accepts a body within the cap", async () => {
      const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ ok: true }])));

      const result = await fetchJson(url, { fetchImpl, maxBytes: 1024 });

      expect(result).toEqual({ outcome: "SUCCESS", payload: [{ ok: true }] });
    });
  });
});
