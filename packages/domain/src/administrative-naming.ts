/**
 * How a Thai administrative area is named on screen.
 *
 * Bangkok is not a จังหวัด. It is a special administrative area governed under its own act, and its
 * divisions are เขต and แขวง rather than อำเภอ and ตำบล. Writing "ต.พระบรมมหาราชวัง อ.พระนคร
 * จ.กรุงเทพมหานคร" is not a cosmetic slip — it names three units of government that do not exist
 * there, on a screen whose whole purpose is to state only what is true.
 *
 * Every label the reader sees comes from here, so the distinction is made once instead of being
 * re-remembered at each call site.
 */

export type AdminLevel = "PROVINCE" | "DISTRICT" | "SUBDISTRICT";

/** The province's own name carries the words "กรุงเทพมหานคร"; no prefix is added to it. */
const BANGKOK_TH = "กรุงเทพมหานคร";

export function isBangkok(provinceNameTh: string): boolean {
  return provinceNameTh.trim() === BANGKOK_TH;
}

const PREFIX_STANDARD: Record<AdminLevel, string> = {
  PROVINCE: "จ.",
  DISTRICT: "อ.",
  SUBDISTRICT: "ต.",
};

const PREFIX_BANGKOK: Record<AdminLevel, string> = {
  PROVINCE: "",
  DISTRICT: "เขต",
  SUBDISTRICT: "แขวง",
};

/** The short prefix used immediately before a name, e.g. "ต." or "แขวง". */
export function areaPrefixTh(level: AdminLevel, provinceNameTh: string): string {
  return isBangkok(provinceNameTh) ? PREFIX_BANGKOK[level] : PREFIX_STANDARD[level];
}

/** A name with its prefix, e.g. "ต.บางปลาสร้อย" or "แขวงพระบรมมหาราชวัง". */
export function areaLabelTh(level: AdminLevel, nameTh: string, provinceNameTh: string): string {
  return `${areaPrefixTh(level, provinceNameTh)}${nameTh}`;
}

const NOUN_STANDARD: Record<AdminLevel, string> = {
  PROVINCE: "จังหวัด",
  DISTRICT: "อำเภอ",
  SUBDISTRICT: "ตำบล",
};

const NOUN_BANGKOK: Record<AdminLevel, string> = {
  PROVINCE: BANGKOK_TH,
  DISTRICT: "เขต",
  SUBDISTRICT: "แขวง",
};

/** The unit's name as a noun, for sentences like "ข้อมูลระดับอำเภอ". */
export function areaLevelNounTh(level: AdminLevel, provinceNameTh: string): string {
  return isBangkok(provinceNameTh) ? NOUN_BANGKOK[level] : NOUN_STANDARD[level];
}

/** The full target, finest unit first, as a reader would write an address. */
export function formatTargetTh(area: {
  readonly province_name_th: string;
  readonly district_name_th: string;
  readonly subdistrict_name_th: string;
}): string {
  const province = area.province_name_th;
  return [
    areaLabelTh("SUBDISTRICT", area.subdistrict_name_th, province),
    areaLabelTh("DISTRICT", area.district_name_th, province),
    areaLabelTh("PROVINCE", province, province),
  ].join(" ");
}
