/**
 * Anonymous run authorisation (docs/security-privacy-compliance.md §3).
 *
 * The public `run_id` identifies work and grants nothing. Access is carried by a separate
 * high-entropy capability in an HttpOnly cookie, of which only a SHA-256 digest is stored
 * server-side. The plaintext capability must never reach a URL, a log, a contract body, or
 * application JavaScript.
 */

export const CAPABILITY_COOKIE = "reis_run_cap";

/** Scoped to the run endpoints so it is not attached to asset or lookup requests. */
const COOKIE_PATH = "/api/v1/analysis-runs";
const TWENTY_FOUR_HOURS_SECONDS = 24 * 60 * 60;

/** Public, opaque, and deliberately not derived from the capability. */
export function generateRunId(): string {
  return `run_${toBase64Url(crypto.getRandomValues(new Uint8Array(12)))}`;
}

export function generateCapability(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function digestCapability(capability: string): Promise<string> {
  const bytes = new TextEncoder().encode(capability);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return toBase64Url(new Uint8Array(hash));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function buildCapabilityCookie(capability: string, isHttps: boolean): string {
  const parts = [
    `${CAPABILITY_COOKIE}=${capability}`,
    `Path=${COOKIE_PATH}`,
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${TWENTY_FOUR_HOURS_SECONDS}`,
  ];
  // Secure is required in hosted environments; localhost dev is served over http.
  if (isHttps) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function readCapabilityCookie(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CAPABILITY_COOKIE) {
      return rest.join("=") || undefined;
    }
  }
  return undefined;
}

/**
 * Same-origin check for mutating requests (docs/technology-stack.md §7). A cross-site form post
 * would still carry the SameSite=Lax cookie on a top-level navigation, so the Origin header is
 * checked as well rather than relying on the cookie attribute alone.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) {
    // Same-origin fetches from our own SPA always send Origin; treat its absence as untrusted.
    return false;
  }
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}
