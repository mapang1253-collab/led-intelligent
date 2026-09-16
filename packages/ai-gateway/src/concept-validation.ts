import {
  ACTIVITY_IDS,
  type ActivityId,
  BUILDING_TYPES_TH,
  type BuildingTypeTh,
  CONCEPT_SCHEMA_VERSION,
  type OpportunityBrief,
  type PotentialUseConcept,
} from "@reis/contracts";

/**
 * Deterministic acceptance of a model response (docs/ai-architecture.md §4).
 *
 * The checks run in the order the architecture fixes: parse, schema and version, Thai locale and
 * the visible-language contract, closed enums and ID existence, citation membership, then
 * duplicates. Order matters because each later check assumes the earlier one held.
 *
 * Two rules do most of the work here. A citation the model invented is rejected rather than
 * dropped, because a concept resting on a fact that was never in evidence is not a weaker concept —
 * it is a fabricated one. And an activity outside the vocabulary is carried as UNMAPPED rather than
 * snapped to the nearest ID, because a wrong legal class is worse than an honest gap.
 */

export interface ValidationIssue {
  readonly reason: string;
  readonly detail: string;
}

export type ConceptValidation =
  | {
      readonly ok: true;
      readonly concepts: readonly PotentialUseConcept[];
      readonly duplicates_merged: number;
      readonly issues: readonly ValidationIssue[];
    }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const THAI = /[฀-๿]/;

/**
 * A visible field must actually be Thai. Official names and abbreviations may appear inside Thai
 * text (docs/ai-architecture.md §3), so the test is that Thai is present and does not merely
 * decorate a Latin sentence — not that Latin is absent.
 */
export function isThaiVisibleText(value: string): boolean {
  if (!THAI.test(value)) {
    return false;
  }
  const thaiChars = (value.match(/[฀-๿]/g) ?? []).length;
  const latinChars = (value.match(/[A-Za-z]/g) ?? []).length;
  return thaiChars >= latinChars;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** Normalised activity+building signature, used to merge concepts that differ only in wording. */
function conceptSignature(concept: PotentialUseConcept): string {
  return `${[...concept.activity_ids].sort().join(",")}|${concept.building_type_th}`;
}

export function validateConceptResponse(
  payload: unknown,
  brief: OpportunityBrief,
): ConceptValidation {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(payload)) {
    return {
      ok: false,
      issues: [{ reason: "SCHEMA", detail: "response was not an array of concepts" }],
    };
  }
  if (payload.length === 0) {
    return { ok: false, issues: [{ reason: "EMPTY", detail: "response contained no concepts" }] };
  }

  const allowedActivities = new Set<string>(
    brief.allowed_activity_ids.length > 0 ? brief.allowed_activity_ids : ACTIVITY_IDS,
  );
  const allowedBuildingTypes = new Set<string>(
    brief.allowed_building_types_th.length > 0
      ? brief.allowed_building_types_th
      : BUILDING_TYPES_TH,
  );
  const citableEvidence = new Set(brief.evidence_cards.map((card) => card.evidence_id));

  const accepted: PotentialUseConcept[] = [];
  const seenIds = new Set<string>();
  const signatures = new Map<string, PotentialUseConcept>();
  let duplicatesMerged = 0;

  for (const [index, raw] of payload.entries()) {
    const where = `concept[${index}]`;
    const reject = (reason: string, detail: string) => {
      issues.push({ reason, detail: `${where}: ${detail}` });
    };

    if (!isObject(raw)) {
      reject("SCHEMA", "not an object");
      continue;
    }
    if (raw.schema_version !== CONCEPT_SCHEMA_VERSION) {
      reject(
        "SCHEMA_VERSION",
        `expected ${CONCEPT_SCHEMA_VERSION}, got ${String(raw.schema_version)}`,
      );
      continue;
    }
    if (raw.locale !== "th-TH") {
      reject("LOCALE", `expected th-TH, got ${String(raw.locale)}`);
      continue;
    }
    if (!nonEmptyString(raw.concept_id)) {
      reject("SCHEMA", "concept_id missing");
      continue;
    }
    if (seenIds.has(raw.concept_id)) {
      reject("DUPLICATE_ID", `concept_id ${raw.concept_id} repeated`);
      continue;
    }

    const visibleFields = [
      "label_th",
      "description_th",
      "supporting_reason_th",
      "uncertainty_th",
    ] as const;
    let visibleOk = true;
    for (const field of visibleFields) {
      const value = raw[field];
      if (!nonEmptyString(value)) {
        reject("SCHEMA", `${field} missing`);
        visibleOk = false;
        break;
      }
      if (!isThaiVisibleText(value)) {
        // Every user-visible field is Thai (RD-10). English-only output is rejected, not translated.
        reject("LANGUAGE", `${field} is not Thai`);
        visibleOk = false;
        break;
      }
    }
    if (!visibleOk) {
      continue;
    }

    if (!stringArray(raw.activity_ids) || raw.activity_ids.length === 0) {
      reject("SCHEMA", "activity_ids missing");
      continue;
    }
    const unknownActivities = raw.activity_ids.filter((id) => !allowedActivities.has(id));
    if (unknownActivities.length > 0) {
      // Not substituted for a nearby ID merely to continue (docs/ai-architecture.md §4).
      reject(
        "UNKNOWN_ACTIVITY",
        `activity not in the supplied vocabulary: ${unknownActivities.join(", ")}`,
      );
      continue;
    }
    if (
      typeof raw.building_type_th !== "string" ||
      !allowedBuildingTypes.has(raw.building_type_th)
    ) {
      reject(
        "UNKNOWN_BUILDING_TYPE",
        `building_type_th not in the supplied vocabulary: ${String(raw.building_type_th)}`,
      );
      continue;
    }

    const unmapped = stringArray(raw.unmapped_activities_th) ? raw.unmapped_activities_th : [];

    if (!stringArray(raw.supporting_evidence_ids)) {
      reject("SCHEMA", "supporting_evidence_ids missing");
      continue;
    }
    const invented = raw.supporting_evidence_ids.filter((id) => !citableEvidence.has(id));
    if (invented.length > 0) {
      // A citation to something the model was never given is a fabricated fact, not a weak one.
      reject("CITATION", `cites evidence not present in the brief: ${invented.join(", ")}`);
      continue;
    }

    if (!Array.isArray(raw.demand_hypotheses) || raw.demand_hypotheses.length === 0) {
      reject("SCHEMA", "demand_hypotheses missing");
      continue;
    }
    let hypothesesOk = true;
    for (const hypothesis of raw.demand_hypotheses) {
      if (!isObject(hypothesis)) {
        reject("SCHEMA", "demand hypothesis is not an object");
        hypothesesOk = false;
        break;
      }
      for (const field of ["population_th", "mechanism_th", "counter_evidence_th"] as const) {
        const value = hypothesis[field];
        if (!nonEmptyString(value) || !isThaiVisibleText(value)) {
          reject("LANGUAGE", `demand hypothesis ${field} missing or not Thai`);
          hypothesesOk = false;
          break;
        }
      }
      if (!hypothesesOk) {
        break;
      }
      const ids = hypothesis.supporting_evidence_ids;
      if (!stringArray(ids)) {
        reject("SCHEMA", "demand hypothesis supporting_evidence_ids missing");
        hypothesesOk = false;
        break;
      }
      const inventedHere = ids.filter((id) => !citableEvidence.has(id));
      if (inventedHere.length > 0) {
        reject(
          "CITATION",
          `demand hypothesis cites evidence not in the brief: ${inventedHere.join(", ")}`,
        );
        hypothesesOk = false;
        break;
      }
    }
    if (!hypothesesOk) {
      continue;
    }

    const concept: PotentialUseConcept = {
      schema_version: CONCEPT_SCHEMA_VERSION,
      locale: "th-TH",
      concept_id: raw.concept_id,
      label_th: raw.label_th as string,
      description_th: raw.description_th as string,
      supporting_reason_th: raw.supporting_reason_th as string,
      uncertainty_th: raw.uncertainty_th as string,
      activity_ids: raw.activity_ids as ActivityId[],
      unmapped_activities_th: unmapped,
      building_type_th: raw.building_type_th as BuildingTypeTh,
      supporting_evidence_ids: raw.supporting_evidence_ids,
      demand_hypotheses: raw.demand_hypotheses as PotentialUseConcept["demand_hypotheses"],
    };

    // Variants that differ only by wording are merged; genuinely different activity or building
    // shapes are kept, because those are different things to screen.
    const signature = conceptSignature(concept);
    if (signatures.has(signature)) {
      duplicatesMerged += 1;
      issues.push({
        reason: "DUPLICATE",
        detail: `${where}: merged into ${signatures.get(signature)?.concept_id}`,
      });
      continue;
    }
    signatures.set(signature, concept);
    seenIds.add(concept.concept_id);
    accepted.push(concept);
  }

  if (accepted.length === 0) {
    return { ok: false, issues };
  }
  return { ok: true, concepts: accepted, duplicates_merged: duplicatesMerged, issues };
}
