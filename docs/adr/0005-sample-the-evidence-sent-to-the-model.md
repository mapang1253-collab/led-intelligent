# ADR 0005 — The brief carries a sample of each evidence cohort, not all of it

- **Status:** Accepted
- **Date:** 2026-09-18
- **Context:** the concept stage failed on most runs, and the owner asked why

## Problem

`buildOpportunityBrief` put every admissible evidence link into the prompt with no cap.
For ต.แสนสุข that is 597 condominium price rows; for ต.หนองปรือ, 633. At roughly 190 Thai
characters per card that is a prompt of 113,000–120,000 characters.

Gemini's free tier allows **250,000 input tokens per minute**
(`GenerateContentInputTokensPerModelPerMinute-FreeTier`), so two runs of a
well-documented area inside one minute exhaust it. Measured from
`operations.ai_call_log` on 2026-09-18:

| outcome | calls |
|---|---|
| `AI_RATE_LIMITED` | 122 |
| `SUCCESS` | 34 |
| `AI_PROVIDER_BUSY` | 7 |
| `AI_TIMEOUT` | 1 |

The daily quota was not the constraint — 236 of 400 calls remained. Three quarters of
calls failed on the per-minute token budget, and because the validation, scenario and
comparison stages all consume concepts, every one of those 122 failures produced a run
with four stages that did nothing.

## Decision

The brief carries at most **12 cards per cohort**, where a cohort is one measure at one
geography level. Selection takes a prefix of the corpus, which arrives already ordered by
the link policy, so the choice is deterministic and two runs of the same area are identical.

The number omitted is stated in the brief, once per truncated cohort:
`แสดงเป็นตัวอย่าง 12 จาก 597 รายการของชุดข้อมูลนี้ในระดับพื้นที่เดียวกัน`.

`briefCitationIndex` applies the identical selection. Citation keys number positions in what
the model was shown, so an index built over the full corpus would resolve `ev3` to a row the
model never saw.

## Why this is not a loss of evidence

Nothing is removed from the analysis. The full corpus is still acquired, still stored against
the run, still shown on the evidence screen, and still what the validation stage reads. This
changes one thing only: what the **model** is shown when it proposes concepts.

What a model needs from a price cohort is its level and its spread. The 598th row of the same
measure at the same geography carries neither more of the first nor more of the second — it is
the same measure repeated. What a sample does lose is a particular building's name, and the
model is not asked to reason about particular buildings; it proposes uses for an area.

The omission is declared for the same reason every other limitation in this product is: a
sample presented as a corpus invites exactly the over-generalisation the system exists to
refuse.

## Alternatives rejected

- **Summarise each cohort into min/max/count before sending.** Fewer tokens still, but it
  replaces published figures with a statistic this project computed, and the model could then
  cite only the summary. Citations must resolve to observations.
- **Raise the cap for small cohorts, lower it for large ones.** More tuning than the problem
  needs; 12 already brings a 597-row area under the limit with an order of magnitude to spare.
- **Pay for a higher tier.** Outside the project's free-infrastructure constraint (RD-1), and
  it would leave a prompt that is large for no benefit.
