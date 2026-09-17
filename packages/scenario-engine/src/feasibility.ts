import { Decimal } from "decimal.js";

/**
 * Preliminary financial feasibility from assumptions the reader supplies.
 *
 * Why the inputs come from the reader rather than from evidence: Thailand publishes no systematic
 * public source for construction cost per square metre or for rent by area, and the assessed prices
 * this product does hold are tax bases rather than costs or market rents. Dividing one tax base by
 * another would produce a number that looks like a return and is not one, which is worse than
 * printing nothing. docs/architecture.md's parameter order allows a model assumption as a named
 * tier below exact evidence and proxy, and that is exactly what every figure here is — labelled as
 * such in the method file and on screen, never presented as a finding about the place.
 *
 * What it computes is four of the eight primitives in docs/economic-component-registry.md §2:
 * CAPITAL_SCHEDULE, CAPACITY_TIME_REVENUE, BASIS_SHARE_COST, and simple payback and yield on top of
 * them. Every relationship is one multiplication or one division, shown as a step, so the reader
 * checks the arithmetic instead of trusting it.
 *
 * What it must never be read as is in the method file's `never_produces_th` and repeated on screen:
 * this is undiscounted, so it is not IRR and not NPV, and it is not a conclusion about whether a
 * project is worth building.
 *
 * It executes only from a reviewed, hash-bound method definition, like the legal pack and the
 * assessed valuation before it. An unreviewed pack computes nothing at all.
 */

export interface FeasibilityMethodInput {
  readonly input_id: string;
  readonly label_th: string;
  readonly unit: string;
  readonly obtained_from_th: string;
  readonly evidence_level: string;
}

export interface FeasibilityMethod {
  readonly component_id: string;
  readonly title_th: string;
  readonly formula: string;
  readonly inputs: readonly FeasibilityMethodInput[];
  readonly output_unit: string;
  readonly coverage_th: string;
  readonly limitations_th: readonly string[];
}

export interface FeasibilityMethodPack {
  readonly method_id: string;
  readonly version: string;
  readonly title_th: string;
  readonly lifecycle_state: "DRAFT" | "ACADEMIC_REVIEWED" | "RETIRED";
  readonly basis_th: string;
  readonly produces_th: string;
  readonly never_produces_th: readonly string[];
  readonly methods: readonly FeasibilityMethod[];
  readonly sensitivity: {
    readonly title_th: string;
    readonly basis_th: string;
    readonly variations_percent: readonly number[];
    readonly varied_inputs: readonly string[];
  };
  readonly review: {
    readonly reviewers: readonly string[];
    readonly reviewed_on: string;
    readonly content_hash: string;
    readonly evidence_basis_th: string;
    readonly limitations_th: readonly string[];
  } | null;
}

/** Everything the calculation needs. Every field is stated by the reader or derived from one. */
export interface FeasibilityAssumptions {
  /** From the assessed land valuation, or typed in. A tax base, not a purchase price. */
  readonly landValueBaht: number;
  readonly floorAreaSqm: number;
  readonly constructionCostPerSqm: number;
  readonly rentPerSqmPerMonth: number;
  /** Between 0 and 1. */
  readonly occupancyRate: number;
  /** Between 0 and 1: operating cost as a share of gross revenue. */
  readonly operatingCostRate: number;
}

/** One line of arithmetic, written so it can be checked by hand. */
export interface FeasibilityStep {
  readonly label_th: string;
  readonly expression_th: string;
  readonly value: string;
  readonly unit: string;
}

export interface SensitivityRow {
  readonly input_id: string;
  readonly label_th: string;
  readonly variation_percent: number;
  /** Null when the varied case produces no positive net income, which has no payback period. */
  readonly payback_years: string | null;
  readonly simple_yield_percent: string | null;
}

export type FeasibilityResult =
  | {
      readonly outcome: "COMPUTED";
      readonly method_version: string;
      readonly capital_total: string;
      readonly gross_annual_revenue: string;
      readonly operating_cost: string;
      readonly net_annual_income: string;
      /** Null when net income is not positive: there is then no period in which it returns. */
      readonly payback_years: string | null;
      readonly simple_yield_percent: string | null;
      readonly steps: readonly FeasibilityStep[];
      readonly sensitivity: readonly SensitivityRow[];
      readonly limitations_th: readonly string[];
    }
  | { readonly outcome: "NOT_COMPUTED"; readonly reason: string };

function notComputed(reason: string): FeasibilityResult {
  return { outcome: "NOT_COMPUTED", reason };
}

const MONTHS_PER_YEAR = 12;

/** Grouped thousands, so a shown expression reads like the values above it. Presentation only. */
function formatBaht(value: Decimal): string {
  const fixed = value.toDecimalPlaces(2).toFixed(value.isInteger() ? 0 : 2);
  const [whole, fraction] = fixed.split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/** A positive, finite number the reader actually supplied. Zero is not "unset", and is rejected. */
function positive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/** A share. Zero is meaningful here — no operating cost — so only the upper bound is exclusive. */
function share(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

interface Core {
  readonly capital: Decimal;
  readonly gross: Decimal;
  readonly operating: Decimal;
  readonly net: Decimal;
}

/** The four numbers, from one set of assumptions. Kept separate so sensitivity can re-run it. */
function core(a: FeasibilityAssumptions): Core {
  const capital = new Decimal(a.landValueBaht).plus(
    new Decimal(a.constructionCostPerSqm).times(a.floorAreaSqm),
  );
  const gross = new Decimal(a.rentPerSqmPerMonth)
    .times(a.floorAreaSqm)
    .times(a.occupancyRate)
    .times(MONTHS_PER_YEAR);
  const operating = gross.times(a.operatingCostRate);
  return { capital, gross, operating, net: gross.minus(operating) };
}

/**
 * Payback and yield, or nulls.
 *
 * A net income at or below zero has no payback period — not an infinite one and not a very large
 * one — so nothing is returned rather than a number the reader would have to know to distrust.
 */
function paybackAndYield(c: Core): { payback: string | null; yieldPercent: string | null } {
  if (!c.net.greaterThan(0) || !c.capital.greaterThan(0)) {
    return { payback: null, yieldPercent: null };
  }
  return {
    payback: c.capital.dividedBy(c.net).toDecimalPlaces(1).toFixed(1),
    yieldPercent: c.net.dividedBy(c.capital).times(100).toDecimalPlaces(2).toFixed(2),
  };
}

function withVariation(
  a: FeasibilityAssumptions,
  inputId: string,
  percent: number,
): FeasibilityAssumptions {
  const factor = 1 + percent / 100;
  switch (inputId) {
    case "rent_per_sqm_per_month":
      return { ...a, rentPerSqmPerMonth: a.rentPerSqmPerMonth * factor };
    case "construction_cost_per_sqm":
      return { ...a, constructionCostPerSqm: a.constructionCostPerSqm * factor };
    case "occupancy_rate":
      // An occupancy above 1 would be more of the building let than exists.
      return { ...a, occupancyRate: Math.min(1, a.occupancyRate * factor) };
    default:
      return a;
  }
}

export function computeFeasibility(
  pack: FeasibilityMethodPack,
  assumptions: FeasibilityAssumptions,
): FeasibilityResult {
  if (pack.lifecycle_state !== "ACADEMIC_REVIEWED" || pack.review === null) {
    // The same gate the legal pack and the valuation method carry: an unreviewed method does not
    // run, however simple its arithmetic looks.
    return notComputed("FEASIBILITY_METHOD_NOT_REVIEWED");
  }
  if (!positive(assumptions.floorAreaSqm)) {
    return notComputed("FLOOR_AREA_MISSING");
  }
  if (!positive(assumptions.constructionCostPerSqm)) {
    return notComputed("CONSTRUCTION_COST_MISSING");
  }
  if (!positive(assumptions.rentPerSqmPerMonth)) {
    return notComputed("RENT_MISSING");
  }
  if (!share(assumptions.occupancyRate) || assumptions.occupancyRate === 0) {
    return notComputed("OCCUPANCY_NOT_USABLE");
  }
  if (!share(assumptions.operatingCostRate)) {
    return notComputed("OPERATING_COST_RATE_NOT_USABLE");
  }
  if (!Number.isFinite(assumptions.landValueBaht) || assumptions.landValueBaht < 0) {
    return notComputed("LAND_VALUE_NOT_USABLE");
  }

  const c = core(assumptions);
  const { payback, yieldPercent } = paybackAndYield(c);

  const steps: FeasibilityStep[] = [
    {
      label_th: "มูลค่าที่ดิน",
      expression_th: "จากราคาประเมินของกรมธนารักษ์ หรือผู้ใช้ระบุ",
      value: formatBaht(new Decimal(assumptions.landValueBaht)),
      unit: "บาท",
    },
    {
      label_th: "ต้นทุนค่าก่อสร้าง",
      expression_th: `${formatBaht(new Decimal(assumptions.constructionCostPerSqm))} × ${formatBaht(new Decimal(assumptions.floorAreaSqm))}`,
      value: formatBaht(
        new Decimal(assumptions.constructionCostPerSqm).times(assumptions.floorAreaSqm),
      ),
      unit: "บาท",
    },
    {
      label_th: "เงินลงทุนรวม",
      expression_th: "มูลค่าที่ดิน + ต้นทุนค่าก่อสร้าง",
      value: formatBaht(c.capital),
      unit: "บาท",
    },
    {
      label_th: "รายรับรวมต่อปี",
      expression_th: `${formatBaht(new Decimal(assumptions.rentPerSqmPerMonth))} × ${formatBaht(new Decimal(assumptions.floorAreaSqm))} × ${assumptions.occupancyRate} × 12`,
      value: formatBaht(c.gross),
      unit: "บาทต่อปี",
    },
    {
      label_th: "ค่าใช้จ่ายดำเนินการต่อปี",
      expression_th: `${formatBaht(c.gross)} × ${assumptions.operatingCostRate}`,
      value: formatBaht(c.operating),
      unit: "บาทต่อปี",
    },
    {
      label_th: "รายได้สุทธิต่อปี",
      expression_th: "รายรับรวมต่อปี − ค่าใช้จ่ายดำเนินการต่อปี",
      value: formatBaht(c.net),
      unit: "บาทต่อปี",
    },
  ];

  if (payback !== null) {
    steps.push(
      {
        label_th: "ระยะเวลาคืนทุนอย่างง่าย",
        expression_th: `${formatBaht(c.capital)} ÷ ${formatBaht(c.net)}`,
        value: payback,
        unit: "ปี",
      },
      {
        label_th: "อัตราผลตอบแทนอย่างง่ายต่อปี",
        expression_th: `${formatBaht(c.net)} ÷ ${formatBaht(c.capital)} × 100`,
        value: yieldPercent ?? "",
        unit: "ร้อยละต่อปี",
      },
    );
  }

  const labelFor = (inputId: string): string => {
    for (const method of pack.methods) {
      const found = method.inputs.find((input) => input.input_id === inputId);
      if (found) {
        return found.label_th;
      }
    }
    return inputId;
  };

  const sensitivity: SensitivityRow[] = [];
  for (const inputId of pack.sensitivity.varied_inputs) {
    for (const percent of pack.sensitivity.variations_percent) {
      const varied = paybackAndYield(core(withVariation(assumptions, inputId, percent)));
      sensitivity.push({
        input_id: inputId,
        label_th: labelFor(inputId),
        variation_percent: percent,
        payback_years: varied.payback,
        simple_yield_percent: varied.yieldPercent,
      });
    }
  }

  return {
    outcome: "COMPUTED",
    method_version: pack.version,
    capital_total: c.capital.toFixed(2),
    gross_annual_revenue: c.gross.toFixed(2),
    operating_cost: c.operating.toFixed(2),
    net_annual_income: c.net.toFixed(2),
    payback_years: payback,
    simple_yield_percent: yieldPercent,
    steps,
    sensitivity,
    limitations_th: pack.methods.flatMap((method) => method.limitations_th),
  };
}
