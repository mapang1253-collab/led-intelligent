import { ShieldAlert } from "lucide-react";

/**
 * A standing notice: the academic disclaimer and the one or two statements that sit with it.
 *
 * Blue, not amber, and on purpose. Amber is the PARTIAL verdict in this product's status palette,
 * and a disclaimer is not a verdict about anything — dressing it as one spent a colour that
 * PASS / FAIL / PARTIAL / UNKNOWN need in order to mean something, and left a reader facing the
 * same alarm colour on every screen whether or not anything was wrong.
 *
 * Translucent and compact rather than a filled slab. docs/output-policy.md §3 binds where this text
 * sits and forbids it carrying "materially smaller emphasis than the recommendation"; it says
 * nothing about colour, and nothing about padding. So it keeps its place — full width, above the
 * topic panels, never behind a control — at the size of something you read rather than something
 * that shouts. It is still the first block on the page and still larger than the notes around it.
 */
export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mt-4 flex items-start gap-2.5 rounded-card px-3.5 py-2.5 text-xs leading-relaxed"
      style={{
        backgroundColor: "var(--notice-bg)",
        color: "var(--notice-ink)",
        border: "1px solid var(--notice-border)",
      }}
    >
      <ShieldAlert size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
