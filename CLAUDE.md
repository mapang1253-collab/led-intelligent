# CLAUDE.md

ไฟล์นี้ให้คำแนะนำแก่ Claude Code (claude.ai/code) เมื่อทำงานกับโค้ดในรีโพนี้

## สถานะปัจจุบันของรีโพนี้

รีโพนี้เป็น **รีโพสำหรับสเปกเท่านั้น** (specification-only): งานวิจัย สถาปัตยกรรม การออกแบบระบบ และสเปกการพัฒนาที่เสร็จสมบูรณ์แล้ว
สำหรับเว็บแอป Highest-and-Best-Use (HBU) ที่เน้นทรัพย์สินเป็นศูนย์กลาง ครอบคลุมทั้งประเทศไทย (โปรเจกต์ระดับมหาวิทยาลัย)
**ยังไม่มีโค้ดแอปพลิเคชันใด ๆ** — ไม่มี `package.json` ไม่มี `apps/` ไม่มี `packages/` ไม่มีอะไรให้ install, build, lint หรือ test
ชลบุรี/EEC เป็นเพียงพื้นที่วิจัยและ fixture สำหรับตรวจสอบความถูกต้องเท่านั้น ไม่ใช่ขอบเขตของผลิตภัณฑ์

**Architecture Freeze v1.0** ถูกประกาศโดยเจ้าของโปรเจกต์เมื่อ 2026-09-15 (เวลาเอเชีย/กรุงเทพฯ) ดู
[`ARCHITECTURE-FREEZE.md`](ARCHITECTURE-FREEZE.md) สำหรับ baseline ที่ล็อกไว้และกฎการเปลี่ยนแปลง
การพัฒนาแอปพลิเคชันจะเริ่มก็ต่อเมื่อคำสั่งของผู้ใช้ในขณะนั้นร้องขออย่างชัดเจนเท่านั้น คำขอให้สร้าง/พัฒนาโปรเจกต์นี้ถือเป็นการอนุญาตที่เพียงพอแล้ว
ก่อนหน้านั้น ให้ถือว่านี่คือรีโพเอกสาร: อ่าน อธิบาย วางแผน — **อย่าเริ่ม scaffold แอปโดยไม่มีการร้องขอ**

## ลำดับการอ่านที่จำเป็นและลำดับความสำคัญของเอกสาร

1. [`ARCHITECTURE-FREEZE.md`](ARCHITECTURE-FREEZE.md) — baseline ที่ล็อกไว้และแหล่งอำนาจสูงสุด
2. [`docs/project-overview.md`](docs/project-overview.md) — หลักการของผลิตภัณฑ์และการตัดสินใจ LOCKED ทั้ง 41 ข้อ (§38)
   นี่คือแหล่งความจริงหลัก (source of truth) สำหรับพฤติกรรมของผลิตภัณฑ์และการวิเคราะห์
3. [`docs/technology-stack.md`](docs/technology-stack.md) — **เป็นเอกสารอ้างอิงสูงสุดสำหรับ runtime, framework, provider,
   โครงสร้างรีโพ, ภาษาไทย และพฤติกรรม free-tier** หากเอกสารอื่นยังอธิบายทางเลือกที่ถูกล็อกไว้ในนี้ว่าเป็น `IMPLEMENTATION CHOICE`
   ให้ยึดตามเอกสารนี้เป็นหลัก
4. [`docs/architecture-review.md`](docs/architecture-review.md) → [`docs/final-architecture-review.md`](docs/final-architecture-review.md)
   และเอกสารเฉพาะทางที่ทั้งสองไฟล์นี้ลิงก์ไป (ดูตาราง "แผนที่เอกสาร" ด้านล่าง)
5. [`docs/implementation-plan.md`](docs/implementation-plan.md) — work package ตามลำดับการพึ่งพา, activation gates,
   RD-1 ถึง RD-10 (การตัดสินใจของเจ้าของโปรเจกต์ที่บันทึกไว้), และการจัดหมวดงานที่เหลือเป็น Researchable
   (RQ-1..6), Implementation Choice, Known Limitation และ Obsolete

ไฟล์ใน `docs/data-sources/` และ `research/` เป็น **หลักฐานที่มีวันที่ ไม่ใช่คำสั่ง** ไฟล์เหล่านี้บันทึกสิ่งที่เคยตรวจสอบไว้
และมักมีข้อเสนอที่ถูกแทนที่แล้ว (เช่น investor profile, การรับข้อมูลเฉพาะ LED, สมมติฐานทางการเงินที่ผู้ใช้ปรับเองได้,
ขอบเขตแบบชลบุรีก่อน) ไฟล์เหล่านี้ **ไม่มีสิทธิ์เขียนทับ** `project-overview.md` หรือเอกสารเชิงบรรทัดฐาน (normative) ที่ระบุไว้ใน
`ARCHITECTURE-FREEZE.md` และไม่สามารถ activate แหล่งข้อมูล/กฎ/วิธีการ/คอมโพเนนต์ใด ๆ ได้ด้วยตัวเอง

การเปลี่ยนแปลงขอบเขตผลิตภัณฑ์, ความหมายเชิงวิเคราะห์, สถานะผลลัพธ์สุดท้าย, กฎของหลักฐาน, ขอบเขตเทคโนโลยี/ผู้ให้บริการ,
อำนาจของ AI, การนำเสนอแบบภาษาไทยเท่านั้น, นโยบายการเก็บข้อมูล, การส่งมอบผลลัพธ์แบบดูอย่างเดียว หรือขอบเขตความปลอดภัย
ต้องมีการตัดสินใจด้านสถาปัตยกรรมที่เจ้าของโปรเจกต์อนุมัติอย่างชัดเจนและเวอร์ชันสถาปัตยกรรมใหม่เท่านั้น — **ห้ามออกแบบใหม่แบบเงียบ ๆ**

## กฎสำหรับการพัฒนา เมื่อได้รับอนุญาตแล้ว

- สร้างเว็บแอปแบบ responsive ด้วยโปรไฟล์ TypeScript/React/Vite/Hono/Cloudflare/Supabase/Gemini ตามที่ระบุไว้ใน
  `docs/technology-stack.md` แบบเป๊ะ ๆ; การพัฒนาและ deploy ในเครื่องต้องไม่ต้องใช้ Docker
- ทำ pipeline เดียวที่ครอบคลุมทุกจังหวัดทั่วประเทศไทย ใช้ชลบุรี/EEC เป็นเพียง fixture สำหรับการรวมระบบและการตรวจสอบเท่านั้น
  ไม่ใช่ขอบเขตของผลิตภัณฑ์หรือ MVP เฉพาะภูมิภาค
- รักษาความสามารถในการสืบย้อน (provenance) ของ Observation และ EvidenceLink ทั้งภูมิศาสตร์ เวลา หน่วยวัด สถานะทางญาณวิทยา
  (epistemic status) และความเหมาะสมกับวัตถุประสงค์ให้ครบถ้วนตลอดทั้งกระบวนการ
- ห้ามเลื่อนระดับหลักฐานระดับพื้นที่ (area evidence) ให้กลายเป็นหลักฐานระดับทรัพย์สิน (property evidence) หรือเลื่อน UNKNOWN ให้เป็น FAIL/PASS
- ห้ามระบุว่าแนวคิดใดเป็น FEASIBLE ในขณะที่ข้อกำหนดสำคัญด้านกฎหมาย กายภาพ หรือดีมานด์ที่เกี่ยวข้องยังเป็น PARTIAL, UNKNOWN,
  CONFLICTED หรือยังไม่ได้รับการแก้ไข
- ถือว่าผลลัพธ์จาก AI เป็นเพียงข้อเสนอที่ต้องผ่าน schema, registry และตัว validator แบบ deterministic
- รันเฉพาะ economic component ที่มีเวอร์ชันเท่านั้น ห้ามเพิ่มสูตรคำนวณไว้ใน prompt เด็ดขาด
- ใช้ spatial และ temporal query ที่มี index ในฐานข้อมูล ห้าม loop ผ่านทั้งตารางในโค้ดแอปพลิเคชัน
- จัดการงานจากแหล่งข้อมูลที่เป็นอิสระต่อกันให้ทำงานพร้อมกันได้ผ่าน limit เฉพาะแต่ละแหล่ง และให้ผลลัพธ์บางส่วน (partial) ได้
  เมื่อการวิเคราะห์ยังพอมีเหตุผลรองรับ
- ให้การคำนวณและ sensitivity analysis เป็นแบบ deterministic เสมอ ห้ามเรียก LLM ซ้ำสำหรับแต่ละ scenario
- แสดงสมมติฐาน (assumption), ข้อมูลทดแทน (proxy) และข้อจำกัดให้เห็นชัดเจนในคำตอบสุดท้ายเสมอ
- รักษาหลักการไม่ต้อง login ของผลิตภัณฑ์ไว้ พร้อมกับแยก analysis run แต่ละครั้งให้เป็นแบบชั่วคราว (ephemeral)
- แยก public run ID ออกจาก authorization capability ให้ชัดเจน ทั้ง run และ capability หมดอายุ 24 ชั่วโมงหลังสร้าง
  การเข้าถึงจะไม่ยืดอายุออกไป และไม่มีการแชร์สาธารณะหรือประวัติย้อนหลัง
- รันเฉพาะเวอร์ชันของ rule/method/component/parameter ที่เป็น `ACADEMIC_REVIEWED` และมีบันทึกการรีวิวที่ระบุชื่อผู้รีวิวไว้อย่างถาวรเท่านั้น
  ห้ามอธิบายว่านี่คือการรับรองระดับวิชาชีพเด็ดขาด
- ใช้ `docs/output-policy.md` กับทุกหน้าจอผลลัพธ์สุดท้าย และคง verification action แบบ deterministic ไว้ทุกครั้ง
- แสดงทุกหน้าจอ สถานะความคืบหน้า ข้อความ error และรายงานที่ผู้ใช้เห็นเป็นภาษาไทยทั้งหมด และตรวจสอบทุกฟิลด์ที่มาจาก AI
  ว่าเป็น `th-TH` ก่อนแสดงผล
- แสดงผลลัพธ์บนหน้าเว็บที่มีการป้องกันเท่านั้น ห้ามทำฟีเจอร์ดาวน์โหลด PDF/JSON, export, print หรือแชร์สาธารณะในแอปพลิเคชัน
- ใช้สถานะ `INCONCLUSIVE` + `NO_FEASIBLE_CANDIDATE` เฉพาะเมื่อเงื่อนไขของ RD-6 ครบทุกข้อเท่านั้น (ดู
  `docs/implementation-plan.md`) ห้ามอ้างว่าไม่มีการใช้ประโยชน์ใด ๆ ที่เป็นไปได้เลย
- แยกความล้มเหลวเชิงปฏิบัติการ (operational run failure) ออกจากสถานะคำแนะนำเชิงวิเคราะห์ (analytical recommendation status) ให้ชัดเจน
- เปิดใช้งานแหล่งข้อมูลภายนอก, ชุดกฎหมาย, วิธีการด้านกายภาพ/ดีมานด์, economic component และชุดพารามิเตอร์ ก็ต่อเมื่อผ่าน
  acceptance gate ใน `docs/implementation-plan.md` แล้วเท่านั้น — สามารถสร้าง adapter/แหล่งข้อมูลในสถานะ inactive ไว้ก่อนได้
  แต่ห้ามให้ผลลัพธ์เชิง active ใด ๆ ก่อนผ่าน gate

เทคโนโลยี ผู้ให้บริการ และภาษาที่ใช้กับผู้ใช้ถูกกำหนดตายตัวโดย RD-8 ถึง RD-10 และ `docs/technology-stack.md`
เวอร์ชัน dependency ที่แน่นอนอยู่ใน manifest/lockfile ที่ commit ไว้ การเปลี่ยนแปลงใด ๆ ต่อสถาปัตยกรรมที่ freeze แล้ว
หรือการตัดสินใจ LOCKED ของผลิตภัณฑ์ ต้องมีการตัดสินใจด้านสถาปัตยกรรมที่เจ้าของโปรเจกต์อนุมัติอย่างชัดเจน เอกสารที่สอดคล้องกัน
และเวอร์ชันสถาปัตยกรรมใหม่เท่านั้น

## คำสั่งที่ใช้ในโปรเจกต์

**ยังไม่มีคำสั่งเหล่านี้ให้ใช้งานจริง** — ยังไม่มี `package.json` หรือ workspace เมื่อเริ่มพัฒนาแล้ว `docs/technology-stack.md` §13
กำหนดให้ implementation ต้องมีคำสั่งเหล่านี้ครบถ้วน (ห้ามคิดชื่อคำสั่งอื่นขึ้นมาเอง):

```text
pnpm install
pnpm setup:check
pnpm db:migrate
pnpm db:seed:academic
pnpm dev            # รัน React app + Worker ผ่าน Cloudflare Vite plugin เชื่อมกับ Supabase dev DB ที่ hosted ไว้ — ไม่ต้องใช้ Docker
pnpm typecheck
pnpm lint           # Biome
pnpm test           # Vitest + Testing Library
pnpm test:e2e       # Playwright
pnpm benchmark
pnpm deploy         # Deploy ผ่าน Wrangler ไปยัง Cloudflare Workers; migration เป็นขั้นตอนแยกก่อนหน้าเสมอ ไม่ใช่ implicit
```

Toolchain: Node.js 24 LTS, pnpm 10 ไม่ต้องรัน `supabase start` เพราะ Supabase แบบ hosted ให้ PostgreSQL/PostGIS สำหรับ dev อยู่แล้ว
ต้องมี `.dev.vars.example`, `.env.migration.example` และ `wrangler.jsonc` ห้าม commit secret ใด ๆ ลงรีโพ และห้ามใช้ prefix
`VITE_` แบบสาธารณะกับ secret เด็ดขาด

## ภาพรวมสถาปัตยกรรม

**Pipeline การวิเคราะห์** (ทุกขั้นตอนพก ID ที่มีเวอร์ชันย้อนกลับไปยัง input ของมันเสมอ และไม่มีขั้นตอนใดที่จะเพิ่มความแม่นยำ/ความแน่นอนเกินกว่าต้นทาง):

```text
รับข้อมูลทรัพย์สิน (Property intake) → ระบุตำแหน่ง/ทรัพย์สิน (resolution) → ชุดหลักฐานที่ยอมรับได้ (admissible evidence set)
  → feature และ opportunity signal แบบ deterministic → แนวคิดที่ AI เสนอในรูปแบบมีโครงสร้าง (structured concepts)
  → ตรวจสอบด้านกฎหมาย + กายภาพ + ดีมานด์ → mapping economic component ที่ควบคุมไว้
  → scenario และ sensitivity แบบ deterministic → เปรียบเทียบแนวคิดและตัดสินความเพียงพอของหลักฐาน
  → แสดงผลลัพธ์เป็นภาษาไทยแบบ deterministic
```

สถานะผลลัพธ์สุดท้ายมีได้เพียงหนึ่งในสามแบบเท่านั้น: `CLEAR_RECOMMENDATION`, `INCONCLUSIVE` (รวมเหตุผล `NO_FEASIBLE_CANDIDATE`
ตาม RD-6) หรือ `INSUFFICIENT_EVIDENCE` — ห้ามบังคับให้มีผู้ชนะ และห้ามกำหนดจำนวน Top-N ตายตัว

**Stack ที่ถูกล็อกไว้** (รายละเอียดเต็มใน `docs/technology-stack.md`): TypeScript (`strict`) · React 19/Vite SPA · React
Router · Tailwind 4 + shadcn/ui (Radix) · React Hook Form + Zod · TanStack Query · Hono บน Cloudflare Workers ·
Cloudflare Workflows/Cron/R2/Hyperdrive · Supabase PostgreSQL/PostGIS · Kysely + `pg` · `@google/genai` ใช้โมเดล
`gemini-3.1-flash-lite` (เรียกได้สูงสุด 2 ครั้งต่อ run: ปกติ 1 ครั้ง + ซ่อม (repair) อีก 1 ครั้ง) · `decimal.js` +
PostgreSQL `numeric` สำหรับค่าที่เกี่ยวกับเงิน/ความแม่นยำทุกค่า · Vitest/Testing Library/Playwright · Biome · Wrangler
ใช้ Cloudflare project เดียวให้บริการทั้ง SPA และ `/api/v1/*` จาก origin เดียวกัน ห้ามใช้ Docker, ห้ามใช้ Next.js/SSR,
ห้ามใช้ Redis/Kubernetes/GraphQL/WebSockets และยังไม่ใช้ Cloudflare Queues ในช่วงแรก

**โครงสร้างรีโพที่วางแผนไว้** (`docs/technology-stack.md` §4 — ยังไม่ได้สร้างจริง):

```text
apps/web/src/{client,worker,workflows}/   # client: routes/components/features; worker: Hono API; workflows: Cloudflare Workflows
packages/{contracts,domain,analysis-engine,evidence-engine,validation-engine,
          scenario-engine,ai-gateway,data-access,source-adapters,i18n,ui,test-fixtures}/
database/{migrations,seeds,reviewed-packs}/
tools/{ingestion,validation,benchmarks}/
public/fonts/
```

ขอบเขตของแต่ละ module เข้มงวดมาก: `contracts`/`domain` ห้าม import อะไรที่ผูกกับ provider ใดโดยเฉพาะ; analytical engine
รับ/ส่งคืนเฉพาะ typed domain contract และห้ามเรียก provider โดยตรงเด็ดขาด; `data-access` เป็นเจ้าของ SQL ทั้งหมด;
`ai-gateway` เป็นตัวเดียวที่เรียก Gemini ได้; `source-adapters` เป็นตัวเดียวที่เรียกแหล่งข้อมูลหลักฐานภายนอกได้;
UI ห้าม import server module เด็ดขาด; หาก package dependency วนเป็นวงกลม (circular) จะถือว่า build fail

**Bounded context / ความเป็นเจ้าของ** (`docs/architecture.md` §2): Intake, Resolution, Source acquisition, Evidence,
Feature preparation, Opportunity discovery, Validation, Economic registry, Scenario, Comparison, Explanation,
Operations แต่ละ context เป็นเจ้าของความรับผิดชอบที่แคบและเฉพาะเจาะจง และมีข้อห้ามชัดเจนไม่ให้ก้าวก่ายอำนาจการวิเคราะห์ของ context อื่น
(เช่น Scenario "ต้องไม่เป็นเจ้าของ: การตัดสินความถูกต้องของกฎหมาย")

**Invariant หลักที่ต้องจำให้ขึ้นใจ ก่อนแตะเอกสารออกแบบใด ๆ หรือโค้ด (ในอนาคต):**

- **AI เสนอ; engine ตรวจสอบ; AI ตีความ** AI ห้ามรับรองความเป็นไปได้ด้านกฎหมาย/กายภาพ/การเงินเด็ดขาด ห้ามคิดสูตรคำนวณขึ้นเอง
  และห้าม override ผลลัพธ์จาก validator
- **หลักฐาน vs. พื้นที่ vs. ทรัพย์สิน มีความแข็งแรงต่างกัน** ความหนักแน่นของคำแนะนำต้องไม่มากไปกว่าความหนักแน่นของหลักฐาน
  ขอบเขตผลลัพธ์คือ `AREA` / `PRELIMINARY_PROPERTY` / `PROPERTY` และถูกติดตามแยกต่างหากจากสถานะผลลัพธ์สุดท้ายเสมอ
- **สถานะการตรวจสอบมี 4 แบบ** — `PASS | FAIL | PARTIAL | UNKNOWN` — ห้ามแปลง UNKNOWN เป็น FAIL เด็ดขาด และ PARTIAL
  ต้องไม่ซ่อนว่าข้อย่อยใดยังไม่ได้รับการแก้ไข
- **Missing model ≠ missing parameter** พฤติกรรมทางเศรษฐกิจที่ไม่รองรับคือ `UNSUPPORTED_MODEL`; ส่วนพารามิเตอร์ที่ยังแก้ไขได้
  ให้ไล่ตามลำดับ หลักฐานตรง (Exact Evidence) → ข้อมูลทดแทนที่เกี่ยวข้อง (Relevant Proxy) → เกณฑ์เทียบ (Benchmark) →
  สมมติฐานของโมเดล (Model Assumption) → ยังไม่มีคำตอบ (Unresolved)
- **`ACADEMIC_REVIEWED` เป็นสถานะวงจรชีวิต** (`DRAFT | ACADEMIC_REVIEWED | RETIRED`) ไม่ใช่การรับรองระดับวิชาชีพหรือ production
  เด็ดขาด รันได้เฉพาะเวอร์ชันของ rule/method/component/parameter ที่เป็น `ACADEMIC_REVIEWED` เท่านั้น
- **Run แบบไม่ระบุตัวตนและชั่วคราว** ไม่มีระบบ login/บัญชีผู้ใช้ `run_id` สาธารณะไม่ได้ให้สิทธิ์เข้าถึงใด ๆ ต้องใช้
  capability ที่หมดอายุแยกต่างหาก (cookie แบบ HttpOnly/Secure/SameSite=Lax เก็บเฉพาะ digest ฝั่งเซิร์ฟเวอร์) เท่านั้น
  ทั้ง run และ capability หมดอายุ 24 ชั่วโมงหลังสร้างพอดี การอ่านผลลัพธ์จะไม่ยืดอายุออกไป และไม่มีฟีเจอร์
  PDF/JSON/CSV/print/export/share/history เด็ดขาด นี่คือการตัดสินใจของผลิตภัณฑ์ที่ล็อกไว้แล้ว ไม่ใช่ฟีเจอร์ที่ขาดหายไปแล้วต้องเพิ่ม
- **UX ภาษาไทยเท่านั้น** ข้อความที่ผู้ใช้เห็นทุกจุดต้องเป็นภาษาไทย (`th-TH`) ฟิลด์จาก AI ต้องใช้ชื่อ `*_th` ชัดเจน
  และต้องผ่านการตรวจสอบ schema + `th-TH` ก่อนแสดงผลเสมอ ส่วนรหัส/enum ภาษาอังกฤษให้ใช้ภายในระบบเท่านั้น
- **`docs/output-policy.md` (`academic-output-v2`)** ควบคุมทุกหน้าจอผลลัพธ์สุดท้าย: คำปฏิเสธความรับผิดชอบเชิงวิชาการ
  (academic disclaimer), ข้อความเฉพาะ scope, ข้อความเฉพาะสถานะ และ `VerificationAction` แบบมีโครงสร้าง ล้วนเป็นสิ่งจำเป็น
  AI ห้ามลดทอนความหนักแน่นของข้อความเหล่านี้ และนี่คือทางออกเดียวสำหรับข้อความประเภท "โปรดตรวจสอบด้วยตนเอง"

## แผนที่เอกสาร

| เอกสาร | ควบคุมเรื่อง |
|---|---|
| [`ARCHITECTURE-FREEZE.md`](ARCHITECTURE-FREEZE.md) | Baseline ที่ล็อกไว้, รายชื่อเอกสารเชิงบรรทัดฐาน, กฎการเปลี่ยนแปลง |
| [`docs/project-overview.md`](docs/project-overview.md) | หลักการของผลิตภัณฑ์, กรอบ HBU, การตัดสินใจ LOCKED ทั้ง 41 ข้อ |
| [`docs/technology-stack.md`](docs/technology-stack.md) | Runtime/framework/provider/โครงสร้างรีโพ/ภาษาไทย/free-tier — เอกสารอ้างอิงสูงสุดเมื่อมีความขัดแย้ง |
| [`docs/architecture.md`](docs/architecture.md) | Invariant ของ pipeline, bounded context, ตาราง output-scope, ความหมายของสถานะ |
| [`docs/data-architecture.md`](docs/data-architecture.md) | Entity หลัก (Property, Observation, EvidenceLink…), เงื่อนไข activate แหล่งข้อมูล, พฤติกรรมเมื่อข้อมูลขาด |
| [`docs/data-persistence-and-lifecycle.md`](docs/data-persistence-and-lifecycle.md) | ประเภทการเก็บข้อมูล, การแยก/ลบ run ภายใน 24 ชม., สถานะความสดของข้อมูล, การทำซ้ำผลลัพธ์ได้ |
| [`docs/database-design.md`](docs/database-design.md) | โครงสร้างสคีมา Supabase/PostGIS, constraint, spatial index |
| [`docs/analysis-architecture.md`](docs/analysis-architecture.md) | การเลือกหลักฐาน, การสร้าง candidate, ลำดับ HBU, ลำดับการตัดสินสถานะสุดท้าย |
| [`docs/validation-architecture.md`](docs/validation-architecture.md) | โมเดลกฎ/ข้อกำหนดด้านกฎหมาย/กายภาพ/ดีมานด์, ความหมายของ PASS/FAIL/PARTIAL/UNKNOWN |
| [`docs/economic-component-registry.md`](docs/economic-component-registry.md) | Economic primitive ที่ควบคุมไว้ทั้ง 8 ตัว, กฎการประกอบ/ป้องกันการนับซ้ำ |
| [`docs/scenario-engine.md`](docs/scenario-engine.md) | การแก้ไขพารามิเตอร์, cash-flow graph, metric ที่ใช้ได้, sensitivity แบบ deterministic |
| [`docs/ai-architecture.md`](docs/ai-architecture.md) | โควตาการเรียก Gemini, สัญญา context/schema, กฎการตรวจสอบ/ซ่อม/ความล้มเหลว |
| [`docs/api-contracts.md`](docs/api-contracts.md) | `RunResultEnvelope` และสัญญาทุก module, HTTP operation สาธารณะ |
| [`docs/system-design.md`](docs/system-design.md) | รูปแบบการ deploy, module, request flow, component ฝั่ง frontend |
| [`docs/performance-and-reliability.md`](docs/performance-and-reliability.md) | เกณฑ์ latency/capacity, การออกแบบ cache, กฎ retry/circuit/recovery |
| [`docs/security-privacy-compliance.md`](docs/security-privacy-compliance.md) | ความปลอดภัยของ anonymous run, การยืนยันตัวตน operator, สิทธิ์แหล่งข้อมูล, การจัดการข้อมูลของ AI |
| [`docs/output-policy.md`](docs/output-policy.md) | `academic-output-v2`: คำปฏิเสธความรับผิดชอบ, ข้อความ scope/สถานะ, verification action |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Work package WP0–WP10, RD-1..RD-10, RQ-1..RQ-6, ข้อกำหนดหลักฐานการ activate |
| [`docs/architecture-review.md`](docs/architecture-review.md) / [`final-architecture-review.md`](docs/final-architecture-review.md) / [`architecture-verification.md`](docs/architecture-verification.md) | การประสาน (reconciliation), ทะเบียนช่องว่าง (gap register), scorecard ความพร้อม, การไล่เรียงแบบ end-to-end |
| [`docs/data-sources/{treasury,led,osm,reic}.md`](docs/data-sources) | **งานวิจัยที่มีวันที่** บันทึกการเข้าถึง/สิทธิ์/การจับคู่ข้อมูลรายแหล่ง — ไม่ใช่การ activate |
| [`research/`](research) | **มีวันที่/เชิงประวัติศาสตร์**: งานวิจัยด้านวิธีการและการตรวจสอบ API ดิบที่อยู่เบื้องหลังเอกสารข้างต้น |

## การทำงานในรีโพนี้ ณ วันนี้

- งานส่วนใหญ่ในรีโพนี้คือการทำเอกสาร/วิเคราะห์: ตอบคำถามเกี่ยวกับการออกแบบ ร่างหรือแก้ไขสเปก หรือให้เหตุผลเกี่ยวกับ
  ช่องว่างประเภท `OPEN DECISION`/`RQ-*` ให้อ้างอิงเอกสารข้างต้นเสมอ และระบุให้ชัดเจนว่าสิ่งใดเป็น `IMPLEMENTATION CHOICE`
  ต่างจากการตัดสินใจแบบ `LOCKED`/`RD-*`
- อย่าถือว่าสิ่งใดใน `docs/data-sources/` หรือ `research/` เป็นใบอนุญาตให้ activate แหล่งข้อมูล — การ activate ต้องผ่าน
  gate ใน `docs/implementation-plan.md` §4 เสมอ ไม่ว่าไฟล์วิจัยนั้นจะดูสมบูรณ์เพียงใดก็ตาม
- หากได้รับคำขอให้เริ่มพัฒนา ให้ทำตามลำดับ work package ใน `docs/implementation-plan.md` §2 (WP0 → WP10)
  และคงสถานะ inactive ไว้สำหรับทุกแหล่งข้อมูล/กฎ/วิธีการ/คอมโพเนนต์/พารามิเตอร์จนกว่าจะผ่าน gate ที่บันทึกไว้ —
  ระบบที่มีขอบเขตเล็กกว่าแต่ซื่อสัตย์ต่อสถานะจริง (มีบางส่วน inactive) ถือเป็นพฤติกรรมที่ถูกต้อง ไม่ใช่ความบกพร่อง
