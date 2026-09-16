import {
  type AiMode,
  type BriefEvidenceInput,
  buildOpportunityBrief,
  createGeminiClient,
  proposeConcepts,
} from "@reis/ai-gateway";
import type {
  CandidateSearchRecord,
  ConceptUnderTest,
  LegalRulePack,
  LegalValidationResult,
  PotentialUseConcept,
} from "@reis/contracts";
import type { StoredEvidenceLink } from "@reis/data-access";
import { validateLegal, verifyPackIntegrity } from "@reis/validation-engine";

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
    };
  }

  const brief = buildOpportunityBrief({
    target_th: input.targetTh,
    effective_on: input.effectiveOn,
    output_scope: input.outputScope,
    evidence: input.evidence.map(toEvidenceInput),
    critical_gaps_th: CRITICAL_GAPS_TH,
  });

  const proposal = await proposeConcepts({
    mode: input.mode,
    brief,
    ...(input.mode === "LIVE_AI" && input.apiKey
      ? { client: createGeminiClient({ apiKey: input.apiKey }) }
      : {}),
    ...(input.recorded ? { recorded: input.recorded } : {}),
  });

  if (proposal.outcome === "FAILED") {
    return {
      state: proposal.code === "AI_DISABLED" ? "SKIPPED" : "FAILED",
      reason: proposal.code,
      concepts: [],
      record: proposal.record,
      validations: [],
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

  return {
    state: "SUCCEEDED",
    concepts: proposal.concepts,
    record: proposal.record,
    validations,
  };
}
