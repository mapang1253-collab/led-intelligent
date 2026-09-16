import type { LegalRulePack } from "@reis/contracts";

/**
 * Pack integrity (docs/validation-architecture.md §9).
 *
 * A review record names people who read a specific set of rules. If a rule is edited afterwards, the
 * record no longer describes what would execute — so the review is bound to a SHA-256 of the rules
 * themselves. Editing a threshold silently invalidates the approval rather than inheriting it.
 *
 * The digest covers the rules and the declared critical families, not the prose around them: a typo
 * fixed in a pack title does not require re-review, a changed threshold does.
 */

/** Stable serialisation: key order fixed, so the digest depends on content and not on formatting. */
export function canonicalPackContent(pack: LegalRulePack): string {
  return stableStringify({
    pack_id: pack.pack_id,
    version: pack.version,
    declared_critical_families: [...pack.declared_critical_families].sort(),
    rules: pack.rules,
  });
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

/** SHA-256 over the canonical content. Uses Web Crypto, present in both Workers and Node. */
export async function computePackHash(pack: LegalRulePack): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalPackContent(pack));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type PackIntegrity =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason_th: string };

/**
 * Checks that a pack may execute: reviewed, signed, and unchanged since it was signed.
 *
 * Returns a reason rather than throwing, because each failure is something the reader should be
 * told about the screen they are looking at.
 */
export async function verifyPackIntegrity(pack: LegalRulePack): Promise<PackIntegrity> {
  if (pack.lifecycle_state !== "ACADEMIC_REVIEWED") {
    return { ok: false, reason_th: "ชุดกฎยังไม่อยู่ในสถานะ ACADEMIC_REVIEWED" };
  }
  if (pack.review === null) {
    return { ok: false, reason_th: "ชุดกฎไม่มีบันทึกการตรวจทานที่ระบุชื่อผู้ตรวจ" };
  }
  if (pack.review.reviewers.length === 0) {
    return { ok: false, reason_th: "บันทึกการตรวจทานไม่ได้ระบุชื่อผู้ตรวจ" };
  }
  const actual = await computePackHash(pack);
  if (actual !== pack.review.content_hash) {
    return {
      ok: false,
      reason_th: "เนื้อหาของชุดกฎถูกแก้ไขหลังการตรวจทาน บันทึกการตรวจทานจึงใช้ไม่ได้",
    };
  }
  return { ok: true };
}
