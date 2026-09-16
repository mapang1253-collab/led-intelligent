import {
  type FinalAnalysis,
  type FinalStatus,
  type FinalStatusReason,
  OUTPUT_POLICY_VERSION,
  type VerificationAction,
} from "@reis/contracts";

/**
 * Deterministic Thai rendering of the final result (docs/output-policy.md `academic-output-v2`).
 *
 * Every required sentence is a constant here, selected by scope and status. None of it is
 * generated, and none of it can be replaced by a model — §8 of the policy makes the deterministic
 * renderer the sole author of the disclaimer, scope, status and verification wording, because a
 * summariser asked to tidy a cautious result reliably makes it sound more certain than it is.
 */

/** §2, verbatim. Changing this text is a policy change, not an implementation detail. */
export const BASE_DISCLAIMER_TH =
  "ผลการวิเคราะห์นี้จัดทำโดยระบบต้นแบบทางวิชาการสำหรับโครงการมหาวิทยาลัย " +
  "โดยอาศัยข้อมูล หลักฐาน แบบจำลอง และสมมติฐานที่แสดง ณ วันที่วิเคราะห์ " +
  "ผลลัพธ์เป็นเครื่องมือช่วยศึกษาความเป็นไปได้เบื้องต้น " +
  "ไม่ใช่คำรับรองทางกฎหมาย วิศวกรรม การสำรวจ การประเมินราคา หรือคำแนะนำการลงทุน " +
  "ก่อนนำผลไปใช้ตัดสินใจจริง ต้องตรวจสอบเอกสารสิทธิ์ กฎหมายและผังเมือง " +
  "สภาพทางกายภาพของทรัพย์ และสมมติฐานทางการเงินกับผู้เชี่ยวชาญที่เกี่ยวข้อง";

/** §4. */
const SCOPE_STATEMENTS_TH = {
  AREA: "ผลนี้เป็นการวิเคราะห์ศักยภาพระดับพื้นที่ ไม่ได้ระบุหรือตรวจสอบแปลงที่ดินหรือทรัพย์สินเฉพาะรายการ",
  PRELIMINARY_PROPERTY:
    "ระบบทราบตำแหน่งโดยประมาณของทรัพย์ แต่ข้อเท็จจริงสำคัญเกี่ยวกับแปลงที่ดินหรือตำแหน่งยังไม่ได้รับการยืนยัน โปรดถือเป็นการวิเคราะห์ทรัพย์เบื้องต้น",
  PROPERTY:
    "ระบบระบุทรัพย์หรือแปลงเป้าหมายได้ตามระดับหลักฐานที่แสดง ความแน่นอนไม่เกินกว่าหลักฐานด้านกฎหมาย กายภาพ ตลาด และการเงินที่ระบุไว้",
} as const;

/** §5. Each is written so it cannot be read as "this land has no use". */
const STATUS_STATEMENTS_TH: Record<FinalStatusReason, string> = {
  NO_SUPPORTED_COMMON_BASIS:
    "ยังไม่มีเกณฑ์เปรียบเทียบร่วมที่รองรับได้สำหรับขอบเขตนี้ ระบบจึงยังไม่ระบุว่าแนวคิดใดเหนือกว่าแนวคิดอื่น " +
    "สิ่งที่แสดงคือแนวคิดที่ประเมินแล้วและผลตรวจเท่าที่ทำได้ พร้อมรายการสิ่งที่ต้องตรวจสอบเพิ่มเพื่อให้สรุปได้",
  NO_DEFENSIBLE_CONCEPTS_GENERATED:
    "การค้นหาแนวคิดเสร็จสิ้นแล้วแต่ไม่มีแนวคิดใดที่หลักฐานปัจจุบันรองรับได้ จึงยังเปรียบเทียบเพื่อหาการใช้ประโยชน์สูงสุดไม่ได้ " +
    "ข้อความนี้ระบุขีดจำกัดของการวิเคราะห์ ไม่ได้หมายความว่าที่ดินนี้ใช้ประโยชน์ไม่ได้",
  NO_FEASIBLE_CANDIDATE:
    "ไม่มีแนวคิดที่ประเมินแล้วรายการใดผ่านข้อกำหนดสำคัญทั้งหมด " +
    "ข้อความนี้ไม่ได้หมายความว่าที่ดินนี้ไม่มีการใช้ประโยชน์ใดที่เป็นไปได้",
  DOMINANCE_REVERSIBLE:
    "มีแนวคิดที่รองรับได้มากกว่าหนึ่งแนวคิด และสถานะของหลักฐานหรือพารามิเตอร์ที่เป็นไปได้ทำให้ลำดับเปลี่ยนได้ ระบบจึงยังไม่ระบุว่าแนวคิดใดเหนือกว่าแนวคิดอื่น",
  SEARCH_TRUNCATED:
    "การค้นหาแนวคิดถูกตัดจบก่อนครอบคลุมหลักฐานทั้งหมด ผลที่แสดงจึงใช้เปรียบเทียบได้เฉพาะในขอบเขตที่ค้นหาไปแล้ว",
};

export interface VerificationInput {
  readonly output_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  /** Legal inputs no concept could resolve, with the rule that needed them. */
  readonly unresolved_legal_inputs: readonly {
    readonly input_id: string;
    readonly label_th: string;
    readonly obtained_from_th: string;
    readonly rule_ids: readonly string[];
  }[];
  /** Approvals the pack identified, with the clause that requires them. */
  readonly approvals: readonly { readonly title_th: string; readonly clause_th: string }[];
  /** Requirements whose applicability could not be settled for want of a site fact. */
  readonly unresolved_applicability: readonly {
    readonly rule_id: string;
    readonly title_th: string;
  }[];
  /** Measures whose evidence describes a containing area rather than the target. */
  readonly area_level_measures_th: readonly string[];
  /** Families of law this pack does not screen at all. */
  readonly unscreened_domains_th: readonly string[];
}

/**
 * Derives verification actions from what actually went unresolved in this run — never a generic
 * checklist. An action a reader cannot trace back to something the screen showed them is noise.
 */
export function buildVerificationActions(input: VerificationInput): VerificationAction[] {
  const actions: VerificationAction[] = [];

  if (input.output_scope === "AREA") {
    actions.push({
      action_id: "identity.parcel",
      domain: "TITLE_AND_IDENTITY",
      priority: "BLOCKING",
      target_th: "เอกสารสิทธิ์ของแปลงที่ดิน เช่น โฉนด เลขที่ดิน และระวาง",
      why_th: "หากยังไม่ระบุแปลงที่ดิน ผลลัพธ์จะอยู่ในระดับพื้นที่เท่านั้น และตรวจข้อกำหนดที่ผูกกับแปลงใดแปลงหนึ่งไม่ได้",
      suggested_source_th: "สำนักงานที่ดินจังหวัดหรือสาขาในพื้นที่",
      related_ids: [],
      could_change_th: "ทำให้ขอบเขตผลลัพธ์เปลี่ยนจากระดับพื้นที่เป็นระดับทรัพย์สินได้",
    });
  }

  for (const approval of input.approvals) {
    actions.push({
      action_id: `approval.${approval.clause_th}`,
      domain: "LAW_AND_PLANNING",
      priority: "BLOCKING",
      target_th: `การขออนุญาตตาม${approval.clause_th}: ${approval.title_th}`,
      why_th: "เป็นข้อกำหนดที่ต้องได้รับอนุญาตก่อน ไม่ใช่ข้อที่ผ่านได้ด้วยการออกแบบ",
      suggested_source_th: "องค์กรปกครองส่วนท้องถิ่นหรือเจ้าพนักงานที่ดูแลที่สาธารณะนั้น",
      related_ids: [approval.clause_th],
      could_change_th: "เปลี่ยนผลตรวจข้อนี้จาก 'ต้องขออนุญาต' เป็นผ่านหรือไม่ผ่าน",
    });
  }

  for (const domain of input.unscreened_domains_th) {
    actions.push({
      action_id: `unscreened.${domain}`,
      domain: "LAW_AND_PLANNING",
      priority: "BLOCKING",
      target_th: domain,
      why_th: "ชุดกฎที่ระบบใช้ไม่ครอบคลุมเรื่องนี้ จึงไม่มีผลตรวจใด ๆ ให้แสดง และไม่อาจถือว่าผ่าน",
      suggested_source_th: "สำนักงานโยธาธิการและผังเมืองจังหวัด หรือองค์กรปกครองส่วนท้องถิ่น",
      related_ids: [],
      could_change_th: "อาจเปลี่ยนความเป็นไปได้ของแนวคิดทั้งหมดที่แสดงอยู่",
    });
  }

  for (const item of input.unresolved_legal_inputs) {
    actions.push({
      action_id: `legal-input.${item.input_id}`,
      domain: "SURVEY_AND_SITE",
      priority: "MATERIAL",
      target_th: item.label_th,
      why_th: `เป็นข้อมูลที่ข้อกำหนด ${item.rule_ids.join(", ")} ต้องใช้ จึงยังสรุปข้อเหล่านั้นไม่ได้`,
      suggested_source_th: item.obtained_from_th,
      related_ids: item.rule_ids,
      could_change_th: "ทำให้ข้อกำหนดที่เกี่ยวข้องเปลี่ยนจาก 'ยังสรุปไม่ได้' เป็นผ่านหรือไม่ผ่าน",
    });
  }

  for (const item of input.unresolved_applicability) {
    actions.push({
      action_id: `applicability.${item.rule_id}`,
      domain: "SURVEY_AND_SITE",
      priority: "MATERIAL",
      target_th: `ข้อเท็จจริงที่ใช้ตัดสินว่า "${item.title_th}" ใช้กับที่ดินนี้หรือไม่`,
      why_th: "เมื่อยังระบุไม่ได้ว่าข้อกำหนดนี้ใช้บังคับหรือไม่ จะตัดออกจากการพิจารณาไม่ได้",
      suggested_source_th: "สำรวจหน้างาน หรือข้อมูลจากองค์กรปกครองส่วนท้องถิ่น",
      related_ids: [item.rule_id],
      could_change_th: "ทำให้ข้อกำหนดนี้ถูกนำมาตรวจจริง หรือถูกตัดออกอย่างมีเหตุผล",
    });
  }

  for (const measure of input.area_level_measures_th) {
    actions.push({
      action_id: `evidence-scope.${measure}`,
      domain: "MARKET_AND_FINANCE",
      priority: "MATERIAL",
      target_th: `${measure} ในระดับพื้นที่เป้าหมายโดยตรง`,
      why_th: "ข้อมูลที่ใช้อยู่เป็นของพื้นที่ที่ครอบคลุมพื้นที่เป้าหมาย จึงใช้เป็นบริบทได้เท่านั้น",
      suggested_source_th: "การสำรวจในพื้นที่ หรือข้อมูลจากหน่วยงานที่เผยแพร่ในระดับที่ละเอียดกว่า",
      related_ids: [],
      could_change_th: "ทำให้ข้อสรุปด้านดีมานด์อ้างอิงพื้นที่เป้าหมายได้โดยตรง",
    });
  }

  // The financial basis is absent by design in this increment; saying so is part of the policy.
  actions.push({
    action_id: "finance.model",
    domain: "MARKET_AND_FINANCE",
    priority: "BLOCKING",
    target_th: "ต้นทุนก่อสร้าง ราคาที่ดิน อัตราผลตอบแทน และสมมติฐานทางการเงินของแต่ละแนวคิด",
    why_th:
      "ระบบยังไม่มีองค์ประกอบทางเศรษฐศาสตร์ที่ผ่านการตรวจทาน จึงคำนวณความเป็นไปได้ทางการเงินและเปรียบเทียบแนวคิดไม่ได้",
    suggested_source_th: "ผู้ประเมินราคาทรัพย์สิน ผู้รับเหมา หรือที่ปรึกษาด้านการพัฒนาโครงการ",
    related_ids: [],
    could_change_th: "เป็นเงื่อนไขที่ขาดอยู่สำหรับการสรุปว่าแนวคิดใดเป็นการใช้ประโยชน์สูงสุด",
  });

  return actions;
}

export interface FinalAnalysisInput {
  readonly analysed_on: string;
  readonly output_scope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  readonly status: FinalStatus;
  readonly status_reason: FinalStatusReason;
  readonly missing_basis_th: readonly string[];
  readonly evaluated_concepts_th: readonly string[];
  readonly verification: VerificationInput;
}

export function renderFinalAnalysis(input: FinalAnalysisInput): FinalAnalysis {
  return {
    schema_version: "1.0.0",
    locale: "th-TH",
    output_policy_version: OUTPUT_POLICY_VERSION,
    analysed_on: input.analysed_on,
    status: input.status,
    status_reason: input.status_reason,
    output_scope: input.output_scope,
    disclaimer_th: BASE_DISCLAIMER_TH,
    scope_statement_th: SCOPE_STATEMENTS_TH[input.output_scope],
    status_statement_th: STATUS_STATEMENTS_TH[input.status_reason],
    missing_basis_th: input.missing_basis_th,
    verification_actions: buildVerificationActions(input.verification),
    evaluated_concepts_th: input.evaluated_concepts_th,
  };
}

export { SCOPE_STATEMENTS_TH, STATUS_STATEMENTS_TH };
