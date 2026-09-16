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
