import { TriangleAlert } from "lucide-react";

/**
 * A limitation stated quietly, beside the thing it limits.
 *
 * These used to be filled amber panels, the same treatment as the academic disclaimer. One run
 * carried fifteen of them across its five topics — five on the prices screen alone, one under every
 * evidence group — and at that density the colour stopped meaning anything. When everything is a
 * warning, nothing is, which is the outcome docs/output-policy.md exists to prevent rather than to
 * cause.
 *
 * So the amber is now spent on the two statements that carry real weight — the base disclaimer §3
 * governs, and "an assessed price is not a market price" — and every per-item caveat reads like
 * this instead. Nothing is hidden: §3's placement rules bind the base disclaimer alone, and the
 * looser requirement these fall under is that limitations be visible, which they are. They sit
 * beside their subject, in the flow, never behind a control anyone has to find.
 */
export function Caveat({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-2 text-ink-muted text-xs leading-relaxed">
      <TriangleAlert size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
