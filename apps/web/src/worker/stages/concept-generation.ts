import {
  type AiMode,
  type BriefEvidenceInput,
  PRIMARY_MODEL,
  buildOpportunityBrief,
  createGeminiClient,
  proposeConcepts,
} from "@reis/ai-gateway";
import { type VerificationInput, decideFinalStatus } from "@reis/analysis-engine";
import type {
  CandidateSearchRecord,
  ConceptUnderTest,
  FinalAnalysis,
  LegalRulePack,
  LegalValidationResult,
  PotentialUseConcept,
} from "@reis/contracts";
import type { Db, StoredEvidenceLink } from "@reis/data-access";
import { validateLegal, verifyPackIntegrity } from "@reis/validation-engine";
import { budgetedClient, readBudgetLimits } from "./budgeted-client.js";

/**
 * Concept proposal and legal screening for one run
 * (docs/analysis-architecture.md §5, docs/validation-architecture.md §3).
 *
 * The order is the product's whole argument: evidence first, then a proposal that may only cite
 * that evidence, then a deterministic screen the proposal cannot influence. The model never sees
 * the rule pack and never learns whether it passed.
 */

export interface ConceptStageResult {
  readonly state: "SUCCEEDED" | "DEGRADED" | "SKIPPED" | "FAILED";
  readonly reason?: string;
  readonly concepts: readonly PotentialUseConcept[];
  readonly record: CandidateSearchRecord | null;
  readonly validations: readonly LegalValidationResult[];
  /** Null while the run has no candidate set at all — an operational state, not a verdict. */
  readonly final: FinalAnalysis | null;
}

/** The critical screens this deployment cannot perform, stated to the model rather than assumed away. */
const CRITICAL_GAPS_TH = [
  "ไม่มีข้อมูลผังเมืองรวมและการใช้ประโยชน์ที่ดินของพื้นที่นี้",
  "ไม่มีข้อมูลขนาดที่ดิน รูปแปลง ความกว้างถนนหน้าที่ดิน และการเข้าถึงตามกฎหมาย",
  "ไม่มีข้อมูลราคาที่ดินหรือต้นทุนก่อสร้างสำหรับพื้นที่นี้",
];

function toEvidenceInput(link: StoredEvidenceLink): BriefEvidenceInput {
  return {
    observation_id: link.observation_id,
    measure_name_th: link.observation.measure_name_th,
    population_th: link.observation.population_th,
    value: link.observation.value,
    unit_name_th: link.observation.unit_name_th,
    area_name_th: link.observation.area_name_th,
    geography_level: link.observation.geography_level,
    source_vintage: link.observation.source_vintage,
    must_not_become_th: link.observation.must_not_become_th,
    source_note_th: link.observation.source_note_th,
    geography_match: link.geography_match,
  };
}

/**
 * Site facts the user asserted, as rule inputs. Only measurements of the land itself reach here;
 * the model contributes no numbers at all, and a fact the user did not give stays absent rather
 * than defaulting to zero.
 */
export function siteInputs(intake: Record<string, unknown>): Record<string, string> {
  const inputs: Record<string, string> = {};
  const numeric = (key: string) => {
    const value = intake[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      inputs[key] = String(value);
    }
  };
  numeric("road_width");
  numeric("water_body_width");
  return inputs;
}

/** A proposed concept, reduced to what the legal screen can act on. Nothing is invented here. */
export function conceptUnderTest(
  concept: PotentialUseConcept,
  site: Record<string, string> = {},
  characteristics: Record<string, string> = {},
): ConceptUnderTest {
  return {
    concept_id: concept.concept_id,
    label_th: concept.label_th,
    activity_ids: [...concept.activity_ids],
    characteristics: { building_type: concept.building_type_th, ...characteristics },
    // Design measurements do not exist for a building nobody has drawn, so the rules needing them
    // report UNKNOWN and name what is missing. Where a site fact makes a threshold computable, the
    // outcome still states what the rule requires of this land.
    inputs: site,
  };
}

export interface ConceptStageInput {
  readonly mode: AiMode;
  readonly apiKey?: string;
  /** Required for LIVE_AI: the budget is reserved in the database before any request is sent. */
  readonly db?: Db;
  readonly budgetEnv?: {
    GEMINI_RPM_LIMIT?: string;
    GEMINI_TPM_LIMIT?: string;
    GEMINI_RPD_LIMIT?: string;
    AI_DAILY_RESERVE_PERCENT?: string;
  };
  readonly targetTh: string;
  readonly effectiveOn: string;
  readonly outputScope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY";
  readonly evidence: readonly StoredEvidenceLink[];
  readonly pack: LegalRulePack;
  readonly areaCodes: readonly number[];
  /** The run's own intake, for site facts the user asserted. */
  readonly intake: Record<string, unknown>;
  readonly recorded?: { readonly fixture_id: string; readonly text: string };
}

export async function runConceptGeneration(input: ConceptStageInput): Promise<ConceptStageResult> {
  if (input.evidence.length === 0) {
    // Proposing uses for a place we know nothing about would be invention, not analysis.
    return {
      state: "SKIPPED",
      reason: "NO_EVIDENCE",
      concepts: [],
      record: null,
      validations: [],
      final: null,
    };
  }

  const brief = buildOpportunityBrief({
    target_th: input.targetTh,
    effective_on: input.effectiveOn,
    output_scope: input.outputScope,
    evidence: input.evidence.map(toEvidenceInput),
    critical_gaps_th: CRITICAL_GAPS_TH,
  });

  let client: ReturnType<typeof createGeminiClient> | undefined;
  if (input.mode === "LIVE_AI") {
    const limits = input.budgetEnv ? readBudgetLimits(input.budgetEnv) : null;
    if (!input.apiKey || !input.db || !limits) {
      // Refused rather than attempted: calling without a recorded, enforceable budget would spend
      // an allowance nobody is measuring (docs/ai-architecture.md §5).
      return {
        state: "FAILED",
        reason: !input.apiKey ? "AI_UNAVAILABLE" : "AI_BUDGET_NOT_CONFIGURED",
        concepts: [],
        record: null,
        validations: [],
        final: null,
      };
    }
    client = budgetedClient(
      input.db,
      PRIMARY_MODEL,
      limits,
      createGeminiClient({ apiKey: input.apiKey }),
    );
  }

  const proposal = await proposeConcepts({
    mode: input.mode,
    brief,
    ...(client ? { client } : {}),
    ...(input.recorded ? { recorded: input.recorded } : {}),
  });

  if (proposal.outcome === "FAILED") {
    return {
      state: proposal.code === "AI_DISABLED" ? "SKIPPED" : "FAILED",
      reason: proposal.code,
      concepts: [],
      record: proposal.record,
      validations: [],
      final: null,
    };
  }

  const integrity = await verifyPackIntegrity(input.pack);
  if (!integrity.ok) {
    // Concepts stand; the legal screen does not run, and the envelope says why.
    return {
      state: "DEGRADED",
      reason: "PACK_NOT_REVIEWED",
      concepts: proposal.concepts,
      record: proposal.record,
      validations: [],
      final: null,
    };
  }

  const site = siteInputs(input.intake);
  const characteristics =
    input.intake.near_large_water_body === true ? { near_large_water_body: "true" } : {};
  const validations = proposal.concepts.map((concept) =>
    validateLegal(input.pack, conceptUnderTest(concept, site, characteristics), {
      area_codes: input.areaCodes,
      effective_on: input.effectiveOn,
    }),
  );

  const outcome = decideFinalStatus({
    analysed_on: input.effectiveOn,
    output_scope: input.outputScope,
    search: proposal.record,
    concepts: proposal.concepts,
    legal: validations,
    // No economic component has been built or reviewed, so no common basis for comparison exists.
    // This is the single fact that keeps every run short of a recommendation.
    economic_components_available: false,
    verification: buildVerificationInput(input, validations),
  });

  return {
    state: "SUCCEEDED",
    concepts: proposal.concepts,
    record: proposal.record,
    validations,
    final: outcome.kind === "ANALYSIS" ? outcome.final : null,
  };
}

/** Everything the result page must tell the reader to go and check, taken from this run's own state. */
function buildVerificationInput(
  input: ConceptStageInput,
  validations: readonly LegalValidationResult[],
): VerificationInput {
  const inputsById = new Map<
    string,
    { input_id: string; label_th: string; obtained_from_th: string; rule_ids: string[] }
  >();
  const approvals = new Map<string, { title_th: string; clause_th: string }>();
  const unresolvedApplicability = new Map<string, { rule_id: string; title_th: string }>();

  for (const validation of validations) {
    for (const outcome of validation.outcomes) {
      for (const missing of outcome.missing_inputs) {
        const existing = inputsById.get(missing.input_id);
        if (existing) {
          if (!existing.rule_ids.includes(outcome.rule_id)) {
            existing.rule_ids.push(outcome.rule_id);
          }
        } else {
          inputsById.set(missing.input_id, {
            input_id: missing.input_id,
            label_th: missing.label_th,
            obtained_from_th: missing.obtained_from_th,
            rule_ids: [outcome.rule_id],
          });
        }
      }
      if (outcome.applicability === "UNRESOLVED") {
        unresolvedApplicability.set(outcome.rule_id, {
          rule_id: outcome.rule_id,
          title_th: outcome.title_th,
        });
      }
    }
    for (const approval of validation.approval_required) {
      approvals.set(approval.rule_id, {
        title_th: approval.title_th,
        clause_th: approval.source.clause_th,
      });
    }
  }

  // Measures for which *no* evidence describes the target itself. A measure that also has an
  // exact-level figure is already answered, and telling the reader to go and find it would waste
  // their time and cost the list its credibility.
  const exact = new Set(
    input.evidence
      .filter((link) => link.geography_match === "EXACT")
      .map((link) => link.observation.measure_name_th),
  );
  const areaLevel = new Set(
    input.evidence
      .filter(
        (link) =>
          link.geography_match === "CONTAINING_AREA" &&
          !exact.has(link.observation.measure_name_th),
      )
      .map((link) => link.observation.measure_name_th),
  );

  return {
    output_scope: input.outputScope,
    unresolved_legal_inputs: [...inputsById.values()],
    approvals: [...approvals.values()],
    unresolved_applicability: [...unresolvedApplicability.values()],
    area_level_measures_th: [...areaLevel],
    // Stated plainly: this pack screens building control only.
    unscreened_domains_th: [
      "ผังเมืองรวมและการใช้ประโยชน์ที่ดิน",
      "ข้อบัญญัติท้องถิ่นและเทศบัญญัติ",
      "ข้อกำหนดด้านสิ่งแวดล้อมและการประเมินผลกระทบ",
    ],
  };
}

/** Test seam: the evidence-derived parts of the verification input, without a run or a database. */
export function buildVerificationInputForTest(
  evidence: readonly StoredEvidenceLink[],
  outputScope: "AREA" | "PRELIMINARY_PROPERTY" | "PROPERTY",
): VerificationInput {
  return buildVerificationInput(
    {
      mode: "AI_DISABLED",
      targetTh: "",
      effectiveOn: "2026-09-16",
      outputScope,
      evidence,
      pack: { rules: [] } as unknown as LegalRulePack,
      areaCodes: [],
      intake: {},
    },
    [],
  );
}
