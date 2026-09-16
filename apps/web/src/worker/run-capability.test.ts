import { describe, expect, it } from "vitest";
import {
  CAPABILITY_COOKIE,
  buildCapabilityCookie,
  digestCapability,
  generateCapability,
  generateRunId,
  isSameOrigin,
  readCapabilityCookie,
} from "./run-capability.js";

/**
 * These are the security invariants of an anonymous run (docs/security-privacy-compliance.md §3).
 * They were verified by hand against the running Worker; these tests keep them verified.
 */

describe("run id", () => {
  it("is opaque and unique", () => {
    const ids = new Set(Array.from({ length: 200 }, generateRunId));
    expect(ids.size).toBe(200);
    for (const id of ids) {
      expect(id).toMatch(/^run_[A-Za-z0-9_-]{16}$/);
    }
  });
});

describe("capability", () => {
  it("carries 256 bits of entropy in a url-safe alphabet", () => {
    const capability = generateCapability();
    expect(capability).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(new Set(Array.from({ length: 200 }, generateCapability)).size).toBe(200);
  });

  it("is not derivable from the run id, and vice versa", () => {
    const runId = generateRunId();
    const capability = generateCapability();
    expect(capability).not.toContain(runId.slice("run_".length));
    expect(runId).not.toContain(capability);
  });

  it("digests stably, irreversibly, and distinctly per capability", async () => {
    const capability = generateCapability();
    const digest = await digestCapability(capability);

    expect(await digestCapability(capability)).toBe(digest);
    expect(digest).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // The stored digest must never contain the plaintext it authorises.
    expect(digest).not.toContain(capability);
    expect(await digestCapability(generateCapability())).not.toBe(digest);
  });

  it("digests a known value to the documented SHA-256", async () => {
    // SHA-256("capability") in base64url, unpadded.
    expect(await digestCapability("capability")).toBe(
      "OKW-ka951-W6mAm_ODxpm2hk7lBEYjn-VqReMrhGOP4",
    );
  });
});

describe("capability cookie", () => {
  it("is HttpOnly, path-scoped to the run endpoints, and expires in exactly 24 hours", () => {
    const cookie = buildCapabilityCookie("cap-value", true);
    expect(cookie).toContain(`${CAPABILITY_COOKIE}=cap-value`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/v1/analysis-runs");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=86400");
    expect(cookie).toContain("Secure");
  });

  it("omits Secure only for http dev, never for https", () => {
    expect(buildCapabilityCookie("cap-value", false)).not.toContain("Secure");
  });

  it("reads its own cookie back out of a multi-cookie header", () => {
    const header = `other=1; ${CAPABILITY_COOKIE}=cap-value; another=2`;
    expect(readCapabilityCookie(header)).toBe("cap-value");
  });

  it("returns undefined when the capability is absent or empty", () => {
    expect(readCapabilityCookie(undefined)).toBeUndefined();
    expect(readCapabilityCookie("other=1")).toBeUndefined();
    expect(readCapabilityCookie(`${CAPABILITY_COOKIE}=`)).toBeUndefined();
    // A cookie whose name merely ends with ours must not match.
    expect(readCapabilityCookie(`not_${CAPABILITY_COOKIE}=cap-value`)).toBeUndefined();
  });

  it("preserves a value containing '=' padding", () => {
    expect(readCapabilityCookie(`${CAPABILITY_COOKIE}=a=b=`)).toBe("a=b=");
  });
});

describe("same-origin check", () => {
  function request(origin: string | undefined): Request {
    return new Request("https://app.example/api/v1/analysis-runs", {
      method: "POST",
      headers: origin ? { Origin: origin } : {},
    });
  }

  it("accepts our own origin", () => {
    expect(isSameOrigin(request("https://app.example"))).toBe(true);
  });

  it("rejects another origin, a missing Origin, and a malformed one", () => {
    expect(isSameOrigin(request("https://evil.example"))).toBe(false);
    expect(isSameOrigin(request(undefined))).toBe(false);
    expect(isSameOrigin(request("not a url"))).toBe(false);
    // A host that merely ends with ours is a different site.
    expect(isSameOrigin(request("https://notapp.example"))).toBe(false);
  });
});
