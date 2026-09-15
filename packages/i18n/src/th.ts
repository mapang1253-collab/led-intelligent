/**
 * Typed Thai (th-TH) string catalog — per docs/technology-stack.md §6 / RD-10, this is the ONLY
 * place user-facing text lives. Components must import from here, never inline Thai/English strings.
 *
 * Grouped to mirror the required components in docs/technology-stack.md §5. Filled in as each
 * screen is built (WP9, Day 7-10 of the current increment — see docs/adr/0001-first-increment-scope.md).
 */
export const th = {
  app: {
    title: "ระบบวิเคราะห์ศักยภาพการลงทุนอสังหาริมทรัพย์",
  },
  intake: {
    provinceLabel: "จังหวัด",
    districtLabel: "อำเภอ/เขต",
    subdistrictLabel: "ตำบล/แขวง",
    provincePlaceholder: "เลือกจังหวัด",
    districtPlaceholder: "เลือกอำเภอ/เขต",
    subdistrictPlaceholder: "เลือกตำบล/แขวง",
    optionalDetailsToggle: "เพิ่มรายละเอียดทรัพย์สิน (ไม่บังคับ)",
    submit: "เริ่มวิเคราะห์",
  },
  progress: {
    queued: "กำลังรอคิวการวิเคราะห์",
    running: "กำลังวิเคราะห์ข้อมูล",
  },
  error: {
    generic: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    invalidAdminArea: "กรุณาเลือกจังหวัด อำเภอ/เขต และตำบล/แขวงให้ครบถ้วนและถูกต้อง",
  },
} as const;

export type ThaiCatalog = typeof th;
