import type { ValuationMethodPack } from "./assessed-valuation.js";

/**
 * Method integrity, on the same principle as the legal pack's (packages/validation-engine).
 *
 * A review record names people who read a specific method. Editing the formula afterwards — turning
 * 400 into 40 in the land conversion, adding a depreciation factor nobody checked — would leave the
 * signature describing something that no longer executes. Binding the record to a digest of the
 * methods makes any such edit invalidate the approval instead of inheriting it.
 *
 * The digest covers what computes: the methods and the statements about what the result may never
 * be read as. A typo fixed in the title does not require re-review; a changed formula does.
 */

export function canonicalMethodContent(pack: ValuationMethodPack): string {
  return stableStringify({
    method_id: pack.method_id,
    version: pack.version,
    never_produces_th: [...pack.never_produces_th].sort(),
    methods: pack.methods,
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

export async function computeMethodHash(pack: ValuationMethodPack): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalMethodContent(pack));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type MethodIntegrity =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason_th: string };

export async function verifyMethodIntegrity(pack: ValuationMethodPack): Promise<MethodIntegrity> {
  if (pack.lifecycle_state !== "ACADEMIC_REVIEWED") {
    return { ok: false, reason_th: "วิธีคำนวณยังไม่อยู่ในสถานะ ACADEMIC_REVIEWED" };
  }
  if (pack.review === null) {
    return { ok: false, reason_th: "วิธีคำนวณไม่มีบันทึกการตรวจทานที่ระบุชื่อผู้ตรวจ" };
  }
  if (pack.review.reviewers.length === 0) {
    return { ok: false, reason_th: "บันทึกการตรวจทานไม่ได้ระบุชื่อผู้ตรวจ" };
  }
  const hash = await computeMethodHash(pack);
  if (hash !== pack.review.content_hash) {
    return {
      ok: false,
      reason_th: "วิธีคำนวณถูกแก้ไขหลังการตรวจทาน บันทึกการตรวจทานเดิมจึงใช้ไม่ได้",
    };
  }
  return { ok: true };
}
