/**
 * @reis/contracts — versioned, transport-neutral contracts shared by client, worker and every
 * analytical engine. Per docs/technology-stack.md §4, this package imports nothing provider-specific
 * (no UI, no database, no Cloudflare, no AI SDK).
 *
 * This is the WP0 scaffold: branded-ID and schema-version primitives only. The full contracts
 * (PropertyIntake, ResolvedTarget, Observation, EvidenceLink, RunResultEnvelope, ...) land per
 * docs/api-contracts.md as each work package in docs/implementation-plan.md is built.
 */

/** Branded primitive so IDs from different entities can never be assigned to each other by mistake. */
export type Brand<Value, BrandName extends string> = Value & { readonly __brand: BrandName };

export type ProvinceId = Brand<string, "ProvinceId">;
export type DistrictId = Brand<string, "DistrictId">;
export type SubdistrictId = Brand<string, "SubdistrictId">;
export type RunId = Brand<string, "RunId">;

/** Every public contract carries a schema_version; bump per-contract, never globally. */
export interface Versioned {
  readonly schema_version: string;
}

/** Decimal-precision values cross contracts as strings (see docs/technology-stack.md §9). */
export type DecimalString = Brand<string, "DecimalString">;
