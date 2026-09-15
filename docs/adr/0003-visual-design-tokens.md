# Brand colours and status colours are separate token sets, both contrast-verified

**Status:** accepted (agreed with project authors, 2026-09-16)

## Context

The result screen has to distinguish, at a glance, several things that carry analytical meaning:
output scope, recommendation status, validation status (PASS / FAIL / PARTIAL / UNKNOWN) and
evidence provenance (direct evidence / proxy / benchmark / assumption). `docs/output-policy.md` also
requires the academic disclaimer to be no less prominent than the recommendation, and
`docs/technology-stack.md` §5 makes sufficient contrast a release requirement.

The project authors proposed a palette of `#8CB9BD` (soft teal), `#FEFBF6` (warm cream), `#ECB159`
(gold) and `#B67352` (terracotta). Measured against that cream background, three of the four failed
WCAG AA for body text: teal 2.08:1, gold 1.85:1, terracotta 3.66:1 (4.5:1 required). The gold also
sat exactly where the PARTIAL/warning colour needs to live, and a brand colour that doubles as a
status colour makes a badge indistinguishable from decoration.

## Decision

Keep the authors' warm cream as the canvas and their teal as a non-text accent, but take the primary
brand colour to a deep navy (`#1E3A5F`, 11.13:1) and hand the gold over to the status palette as
PARTIAL (`#A16812` at text weight, 4.51:1). Brand tokens and status tokens are separate sets;
nothing in the status set is used decoratively, and nothing in the brand set is used to signal an
analytical outcome.

Three further rules fall out of the analytical requirements rather than from taste:

- **UNKNOWN is grey, not amber.** "We don't know" must read as absence, not as a warning, so it can
  never be mistaken for a soft FAIL — the distinction `docs/project-overview.md` §19 calls critical.
- **Colour is never the only signal.** Every status renders colour + icon + Thai label, so the
  meaning survives colour blindness and greyscale printing.
- **The app bar has its own token** rather than reusing primary, because inverting primary for dark
  mode turns the header into a glaring light bar.

Both themes are defined as CSS custom properties, and every foreground/background pair in both was
measured before being committed.

## Consequences

The authors' palette survives as the app's character (warm cream, teal accents, gold) while the
parts that carry meaning are legible and unambiguous. Adding a colour later means adding it to one
of the two sets deliberately and measuring it — there is no "just pick something that looks nice"
path, which is the intended friction.

---

## Update, 2026-09-16 — the restrained direction was rejected

The authors reviewed the implementation of the decision above and rejected its *aesthetic* while
keeping its *discipline*. Their words: the colours were washed out, the cream canvas bland, the
layout stiff, and the whole thing read as AI-generated. They asked for a bold multi-colour gradient
look referencing the Thai app DIME!, and for no emoji anywhere.

What changed:

- **The cream canvas is gone.** Light mode is a cool near-white (`#F7F8FC`), dark mode near-black
  (`#0B0D13`).
- **The signature is now a three-stop gradient, not a flat colour**, selectable from four palettes
  (Aurora, Sunset, Ocean, Berry).
- **Gradients come in two tiers, and this is a hard constraint rather than a style choice.** Bright
  gradients cannot carry white text — measured, every bright palette fell between 2.26:1 and 3.53:1.
  So `--grad-deep-*` is a contrast-verified deepened version used behind text (≥4.6:1 at every
  stop), and `--grad-vivid-*` is the bright version used only for decoration where no text sits.
- **Google Sans was requested and cannot be used**: it is proprietary to Google and may not be
  self-hosted, which `docs/technology-stack.md` §6 requires. Prompt is the closest open geometric
  Thai face and is now the default, with Anuphan, Kanit, Sarabun, IBM Plex Sans Thai and Noto Sans
  Thai Looped also bundled for comparison.
- **Symbol glyphs became Lucide icon components**, per the no-emoji instruction.

What deliberately did **not** change: status colours stay independent of the palette, UNKNOWN stays
grey, colour is never the only signal, and the disclaimer stays visually prominent. Bold styling and
epistemic honesty are not in conflict — conflating them was the error in the original decision.
