import { z } from "zod";

/**
 * PropertyIntake — docs/api-contracts.md §4.
 *
 * Province, district and subdistrict are required and must be normalized administrative IDs, never
 * free text (docs/project-overview.md §7): the user picks from dependent lists so the server never
 * has to guess what "บางปลาสร้อย" refers to.
 *
 * Optional fields carry USER_ASSERTED provenance and never become official fact. Omitting them is
 * not a validation error — it narrows the output scope instead, which is the whole point of
 * progressive intake.
 *
 * The browser and the server share this schema, but the server always validates independently
 * (docs/technology-stack.md §5).
 */

const administrativeId = z
  .string()
  .min(1)
  .regex(/^\d+$/, "administrative id must be a numeric string");

export const propertyIntakeSchema = z.object({
  province_id: administrativeId,
  district_id: administrativeId,
  subdistrict_id: administrativeId,

  /** Optional, USER_ASSERTED. Trimmed empty strings are treated as absent, not as evidence. */
  address_line: z.string().trim().max(200).optional(),
  title_deed_number: z.string().trim().max(60).optional(),
  map_sheet: z.string().trim().max(60).optional(),
  land_number: z.string().trim().max(60).optional(),
  land_area_rai: z.coerce.number().nonnegative().max(100_000).optional(),
  land_area_ngan: z.coerce.number().nonnegative().max(3).optional(),
  land_area_wa: z.coerce.number().nonnegative().max(99.99).optional(),

  /**
   * Site facts, USER_ASSERTED. Deliberately limited to things someone standing on the land can
   * know or measure — the width of the road in front of it, the watercourse beside it. Facts about
   * a building that has not been designed are not asked for: the rules that need them report
   * UNKNOWN and name what is missing, which is the honest answer.
   */
  road_width: z.coerce.number().nonnegative().max(200).optional(),
  water_body_width: z.coerce.number().nonnegative().max(5_000).optional(),
  near_large_water_body: z.coerce.boolean().optional(),

  /**
   * The scale of the building the reader has in mind (docs/adr/0010).
   *
   * Not a site fact and not a measurement — a plan, and the only thing here that describes
   * something which does not exist. It is carried separately all the way to the validator, where
   * it may decide which rules reach the reader and may never decide whether one is satisfied.
   *
   * Bounds are sanity bounds, not law: the tallest building in Thailand is about 318 m, and a
   * figure past these is a typo rather than an intention.
   */
  intended_storey_count: z.coerce.number().int().positive().max(200).optional(),
  intended_building_height: z.coerce.number().positive().max(500).optional(),

  /**
   * Where the reader says the land is, placed by hand on a map (docs/adr/0006).
   *
   * USER_ASSERTED like every other optional field: the system does not verify the pin and it
   * does not raise the output scope, because an assertion is not property evidence. Bounded to
   * Thailand's extent so a transposed pair or a stray click is rejected here rather than sent to
   * an external service as a query about the middle of an ocean.
   */
  latitude: z.coerce.number().min(5.5).max(20.5).optional(),
  longitude: z.coerce.number().min(97).max(106).optional(),
});

export type PropertyIntake = z.infer<typeof propertyIntakeSchema>;

/** One administrative area as returned by GET /api/v1/administrative-areas/*. */
export interface AdministrativeAreaOption {
  readonly id: string;
  readonly code: number;
  readonly name_th: string;
  readonly name_en: string | null;
}

export interface AdministrativeAreaResponse {
  readonly schema_version: string;
  readonly data: readonly AdministrativeAreaOption[];
}
