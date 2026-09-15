# Final Output and Academic Disclaimer Policy

**Status: FROZEN LOCKED OWNER DECISION — included in Architecture Freeze v1.0. Policy version: `academic-output-v2`.**

## 1. Purpose

This policy prevents the academic prototype from presenting a model result as professional certification. It applies to every on-screen FinalAnalysis and any result state rendered by the application.

The policy does not weaken the analytical result. Evidence, validation, scenarios and recommendation states remain unchanged. It controls how their scope, limitations and required verification are displayed.

## 2. Required base disclaimer

### Thai

> ผลการวิเคราะห์นี้จัดทำโดยระบบต้นแบบทางวิชาการสำหรับโครงการมหาวิทยาลัย โดยอาศัยข้อมูล หลักฐาน แบบจำลอง และสมมติฐานที่แสดง ณ วันที่วิเคราะห์ ผลลัพธ์เป็นเครื่องมือช่วยศึกษาความเป็นไปได้เบื้องต้น ไม่ใช่คำรับรองทางกฎหมาย วิศวกรรม การสำรวจ การประเมินราคา หรือคำแนะนำการลงทุน ก่อนนำผลไปใช้ตัดสินใจจริง ต้องตรวจสอบเอกสารสิทธิ์ กฎหมายและผังเมือง สภาพทางกายภาพของทรัพย์ และสมมติฐานทางการเงินกับผู้เชี่ยวชาญที่เกี่ยวข้อง

### English

> This analysis was produced by an academic prototype for a university project using the data, evidence, models and assumptions shown as of the analysis date. It supports preliminary feasibility study and is not legal, engineering, surveying or valuation certification, nor investment advice. Before any real decision, verify title documents, applicable law and planning controls, physical site conditions and financial assumptions with appropriate professionals.

The English paragraph is a documentation reference only. The MVP has no language selector: every on-screen user-facing value uses Thai. Machine-readable transport keys and stable codes remain English. Every final presentation contract contains `locale: "th-TH"` and `output_policy_version`.

## 3. Placement and visibility

The base disclaimer must appear:

1. near the top of the final result after scope/date/status;
2. before any leading-use wording or financial metric that could be copied without context;
3. above any detailed table or section from which a recommendation or financial metric could be read without context.

It cannot be hidden only in a tooltip, modal, collapsed “details” area, terms page or footer with materially smaller emphasis than the recommendation.

## 4. Scope-specific statement

| Output scope | Required statement |
|---|---|
| AREA | “ผลนี้เป็นการวิเคราะห์ศักยภาพระดับพื้นที่ ไม่ได้ระบุหรือตรวจสอบแปลงที่ดินหรือทรัพย์สินเฉพาะรายการ” |
| PRELIMINARY_PROPERTY | “ระบบทราบตำแหน่งโดยประมาณของทรัพย์ แต่ข้อเท็จจริงสำคัญเกี่ยวกับแปลงที่ดินหรือตำแหน่งยังไม่ได้รับการยืนยัน โปรดถือเป็นการวิเคราะห์ทรัพย์เบื้องต้น” |
| PROPERTY | “ระบบระบุทรัพย์หรือแปลงเป้าหมายได้ตามระดับหลักฐานที่แสดง ความแน่นอนไม่เกินกว่าหลักฐานด้านกฎหมาย กายภาพ ตลาด และการเงินที่ระบุไว้” |

Scope text comes from these deterministic Thai templates, not free-form AI.

## 5. Status-specific statement

| Status/reason | Required behavior |
|---|---|
| CLEAR_RECOMMENDATION | Name a leading use only when the deterministic comparison contract permits it. Use the Thai meaning “เป็นทางเลือกที่มีหลักฐานสนับสนุนดีที่สุดในบรรดาแนวคิดที่ระบบประเมินและมีเหตุผลรองรับ” and avoid universal certainty. |
| INCONCLUSIVE | Do not label any candidate “ดีที่สุด.” Explain in Thai the exact tie, reversal, unresolved competitor, incomplete search or other reason. |
| INCONCLUSIVE + NO_FEASIBLE_CANDIDATE | State “ไม่มีแนวคิดที่ประเมินแล้วรายการใดผ่านข้อกำหนดสำคัญทั้งหมด” Show the completed search scope and every exclusion. Never state that the property has no possible use. |
| INSUFFICIENT_EVIDENCE | Do not present a leading use. List in Thai the missing model/evidence/common basis and the minimum verification needed to continue. |
| operational failure | Do not display a recommendation status unless a valid FinalAnalysis already exists. Show Thai retry/expiry information and any safe deterministic partial artifacts separately. |

## 6. Validation and model language

- Legal PASS means the encoded `ACADEMIC_REVIEWED` rules passed for the stated scope/version. It is never worded as legal permission or permit approval.
- Physical PASS means accepted academic evidence met the encoded requirement. It is not an engineering, survey or site-condition certificate.
- Demand PASS means the stated hypothesis passed an activated academic method at its actual geography/population/time. It is not guaranteed demand, occupancy or sales.
- Financial FEASIBLE means the versioned academic model and displayed assumptions meet its documented feasibility relationship. It is not a guaranteed return or formal appraisal.
- UNKNOWN is never rendered as FAIL/PASS. PARTIAL must name the completed and unresolved parts. APPROVAL_REQUIRED must identify the authority/action where known.
- A proxy, benchmark or model assumption keeps its label in summary tables and prose. AI may not remove the label.

## 7. Verification actions

Every material limitation has a structured `VerificationAction` containing:

- `action_id`, domain and priority reason;
- fact/rule/parameter to verify;
- why it can change the conclusion;
- suggested professional/source category;
- related evidence, requirement and candidate IDs; and
- whether completion could change scope, validation, model coverage or recommendation.

The output groups actions under:

1. title/property identity and official documents;
2. law, planning controls and permits;
3. survey, access, engineering and environmental/site facts;
4. market, demand, cost, valuation and financial assumptions; and
5. source currency/licence or unresolved conflicts.

The academic prototype does not contact a professional or claim that an action was completed. A user assertion supplied later remains USER_ASSERTED unless independently verified.

## 8. Thai presentation and AI language

All user-visible navigation, field labels, validation messages, progress states, errors, evidence explanations and analytical narrative are Thai. The presentation layer maps stable English reason codes to versioned Thai messages and never exposes a raw provider error as user guidance.

AI fields intended for display carry `locale: "th-TH"` and explicit `*_th` names. They pass schema, allowed-ID/citation and Thai-language validation before rendering. An invalid response receives at most one repair; repeated failure is rejected. Proper names and established abbreviations may retain their official spelling within Thai sentences. The deterministic Thai renderer supplies all required status/scope/disclaimer/verification wording and cannot be overridden by AI.

## 9. Result-only delivery

The application displays the result only on the capability-protected web page before the 24-hour run expiry. It provides no PDF, JSON, CSV, print, copy-as-report or public-share action. Browser or operating-system screenshot/print behavior is outside the application contract and receives no special layout or export support.

## 10. Acceptance tests

- Every scope and recommendation status renders the correct deterministic statement.
- NO_FEASIBLE_CANDIDATE cannot render without all five RD-6 preconditions.
- Material evidence, counter-evidence, assumptions, proxies, limitations and verification actions are visible in the result page.
- AI output that weakens/removes a required statement is rejected or replaced by deterministic rendering.
- Expired or unauthorized runs cannot render result content.
- The result remains explicitly academic and retains scope and critical limitations without requiring an expandable section.
- Every screen state, error and report field has an accepted Thai rendering; an English-only AI display response fails validation.
- Noto Sans Thai renders all fixture content in the browser without missing glyphs, clipping or fallback-layout corruption.
- No application result-download, export, print or public-share control or endpoint exists.
