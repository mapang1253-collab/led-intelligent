import { Decimal } from "decimal.js";

/**
 * Valuation against the Treasury's published assessment schedule.
 *
 * This is deliberately not one of the eight economic components in
 * docs/economic-component-registry.md §2. Those model cash flows — revenue, cost, capital — and none
 * of them may execute until a reviewed parameter set exists. This does something much smaller and
 * much more defensible: it multiplies a rate the state published by a size the user stated, which is
 * the arithmetic พ.ร.บ.ภาษีที่ดินและสิ่งปลูกสร้าง พ.ศ. 2562 มาตรา 35 itself prescribes for levying tax.
 *
 * It still executes only from a reviewed, hash-bound method definition, for the same reason the
 * legal pack does: the numbers 400 and 100 in a land conversion, and the decision not to deduct
 * depreciation, are choices someone must have read and signed rather than facts about the world.
 *
 * What it must never be read as is stated in the method file and repeated on every result: an
 * assessed value is set to levy tax and sits well below a market price.
 */

export interface ValuationInput {
  readonly input_id: string;
  readonly label_th: string;
  readonly unit: string;
  readonly obtained_from_th: string;
  readonly evidence_level: string;
}

export interface ValuationMethod {
  readonly component_id: string;
  readonly title_th: string;
  readonly formula: string;
  readonly inputs: readonly ValuationInput[];
  readonly output_unit: string;
  readonly coverage_th: string;
  readonly limitations_th: readonly string[];
}

export interface ValuationMethodPack {
  readonly method_id: string;
  readonly version: string;
  readonly title_th: string;
  readonly lifecycle_state: "DRAFT" | "ACADEMIC_REVIEWED" | "RETIRED";
  readonly basis_th: string;
  readonly produces_th: string;
  readonly never_produces_th: readonly string[];
  readonly methods: readonly ValuationMethod[];
  readonly review: {
    readonly reviewers: readonly string[];
    readonly reviewed_on: string;
    readonly content_hash: string;
    readonly evidence_basis_th: string;
    readonly limitations_th: readonly string[];
  } | null;
}

/** Thai land measure, fixed by ประมวลกฎหมายที่ดิน: 1 ไร่ = 4 งาน = 400 ตารางวา, 1 ตารางวา = 4 ตารางเมตร. */
const WA_PER_RAI = 400;
const WA_PER_NGAN = 100;
const SQM_PER_WA = 4;

export interface LandArea {
  readonly rai?: number;
  readonly ngan?: number;
  readonly wa?: number;
}

/** Converts a Thai land area to square wa. A unit conversion fixed by statute, not an estimate. */
export function toSquareWa(area: LandArea): Decimal {
  return new Decimal(area.rai ?? 0)
    .times(WA_PER_RAI)
    .plus(new Decimal(area.ngan ?? 0).times(WA_PER_NGAN))
    .plus(new Decimal(area.wa ?? 0));
}

export function squareWaToSquareMetres(wa: Decimal): Decimal {
  return wa.times(SQM_PER_WA);
}

/** One line of the arithmetic, so a reader can check the result rather than trust it. */
export interface ValuationStep {
  readonly label_th: string;
  readonly expression_th: string;
  readonly value: string;
  readonly unit: string;
}

export type ValuationResult =
  | {
      readonly outcome: "COMPUTED";
      readonly component_id: string;
      readonly method_version: string;
      readonly value: string;
      readonly unit: string;
      readonly steps: readonly ValuationStep[];
      readonly limitations_th: readonly string[];
    }
  | { readonly outcome: "NOT_COMPUTED"; readonly reason: string };

function notComputed(reason: string): ValuationResult {
  return { outcome: "NOT_COMPUTED", reason };
}

/**
 * Grouped thousands for a Thai reader. Applied to the shown expression as well as the shown values,
 * so the line a reader checks by hand reads the same as the lines above it.
 *
 * Presentation only — `value` on the result keeps the unrounded decimal.
 */
function formatBaht(value: Decimal): string {
  const fixed = value.toDecimalPlaces(2).toFixed(value.isInteger() ? 0 : 2);
  const [whole, fraction] = fixed.split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

export interface ConstructionValuationRequest {
  /** The published rate, as a decimal string exactly as the evidence carries it. */
  readonly ratePerSqm: string;
  readonly floorAreaSqm: number;
  /** The building type the rate belongs to, repeated so a reader sees what was priced. */
  readonly buildingTypeTh: string;
}

/**
 * Assessed value of a building: the published rate for its type in its province, times its floor
 * area. Both factors are named in the result, because the same area against a different type is a
 * different number and a figure with no type attached cannot be checked.
 */
export function valueConstruction(
  pack: ValuationMethodPack,
  request: ConstructionValuationRequest,
): ValuationResult {
  if (pack.lifecycle_state !== "ACADEMIC_REVIEWED" || pack.review === null) {
    // Same gate as the legal pack: an unreviewed method does not run, however simple it looks.
    return notComputed("VALUATION_METHOD_NOT_REVIEWED");
  }
  const method = pack.methods.find((m) => m.component_id === "ASSESSED_CONSTRUCTION_VALUE");
  if (!method) {
    return notComputed("VALUATION_METHOD_MISSING");
  }

  let rate: Decimal;
  try {
    rate = new Decimal(request.ratePerSqm);
  } catch {
    return notComputed("RATE_NOT_NUMERIC");
  }
  if (!rate.isFinite() || rate.lessThanOrEqualTo(0)) {
    return notComputed("RATE_NOT_USABLE");
  }
  if (!Number.isFinite(request.floorAreaSqm) || request.floorAreaSqm <= 0) {
    // An area of zero is not a building worth nothing; it is an area nobody supplied.
    return notComputed("FLOOR_AREA_MISSING");
  }

  const area = new Decimal(request.floorAreaSqm);
  const value = rate.times(area);

  return {
    outcome: "COMPUTED",
    component_id: method.component_id,
    method_version: pack.version,
    value: value.toFixed(2),
    unit: method.output_unit,
    steps: [
      {
        label_th: `ราคาประเมินต่อตารางเมตร (${request.buildingTypeTh})`,
        expression_th: "จากบัญชีราคาประเมินของกรมธนารักษ์",
        value: formatBaht(rate),
        unit: "บาทต่อตารางเมตร",
      },
      {
        label_th: "พื้นที่อาคารรวมทุกชั้น",
        expression_th: "ผู้ใช้ระบุ",
        value: formatBaht(area),
        unit: "ตารางเมตร",
      },
      {
        label_th: "มูลค่าสิ่งปลูกสร้างตามราคาประเมิน",
        expression_th: `${formatBaht(rate)} × ${formatBaht(area)}`,
        value: formatBaht(value),
        unit: "บาท",
      },
    ],
    limitations_th: method.limitations_th,
  };
}

export interface LandValuationRequest {
  /** The published rate per square wa, as a decimal string exactly as the evidence carries it. */
  readonly ratePerSquareWa: string;
  readonly area: LandArea;
  /** The land position the rate belongs to (roadside, riverside, remainder). */
  readonly positionTh: string;
}

/**
 * Assessed value of land: the published rate per square wa for a land position in the subdistrict,
 * times the area the user stated. The Thai measure is converted by statute, so the conversion is
 * shown as its own step rather than folded into the multiplication.
 */
export function valueLand(
  pack: ValuationMethodPack,
  request: LandValuationRequest,
): ValuationResult {
  if (pack.lifecycle_state !== "ACADEMIC_REVIEWED" || pack.review === null) {
    return notComputed("VALUATION_METHOD_NOT_REVIEWED");
  }
  const method = pack.methods.find((m) => m.component_id === "ASSESSED_LAND_AREA_CONVERSION");
  if (!method) {
    return notComputed("VALUATION_METHOD_MISSING");
  }

  let rate: Decimal;
  try {
    rate = new Decimal(request.ratePerSquareWa);
  } catch {
    return notComputed("RATE_NOT_NUMERIC");
  }
  if (!rate.isFinite() || rate.lessThanOrEqualTo(0)) {
    return notComputed("RATE_NOT_USABLE");
  }

  const wa = toSquareWa(request.area);
  if (wa.lessThanOrEqualTo(0)) {
    return notComputed("LAND_AREA_MISSING");
  }

  const value = rate.times(wa);
  const { rai = 0, ngan = 0, wa: sqwa = 0 } = request.area;

  return {
    outcome: "COMPUTED",
    component_id: method.component_id,
    method_version: pack.version,
    value: value.toFixed(2),
    unit: "บาท",
    steps: [
      {
        label_th: "เนื้อที่ดินที่ระบุ",
        expression_th: `${rai} ไร่ ${ngan} งาน ${sqwa} ตารางวา → (${rai}×400) + (${ngan}×100) + ${sqwa}`,
        value: formatBaht(wa),
        unit: "ตารางวา",
      },
      {
        label_th: `ราคาประเมินที่ดินต่อตารางวา (${request.positionTh})`,
        expression_th: "จากบัญชีราคาประเมินของกรมธนารักษ์",
        value: formatBaht(rate),
        unit: "บาทต่อตารางวา",
      },
      {
        label_th: "มูลค่าที่ดินตามราคาประเมิน",
        expression_th: `${formatBaht(rate)} × ${formatBaht(wa)}`,
        value: formatBaht(value),
        unit: "บาท",
      },
    ],
    limitations_th: method.limitations_th,
  };
}
