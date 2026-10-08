import { Building2, FileSearch, TrendingUp } from "lucide-react";

/**
 * Specimen copy for the design preview — invented, and deliberately kept out of `@reis/i18n`.
 *
 * The repo's rule is that user-visible Thai lives in `packages/i18n` and never in a component, and
 * this file is how the preview keeps to it without breaking something worse. Every figure here is
 * made up: the household income, the subdistrict, the concept, the disclaimer wording. They exist
 * to show what a number and a caveat look like in a given font at a given weight. Putting them in
 * the product's own string table would file fabricated analysis beside the sentences the product
 * really says, which is the one thing docs/output-policy.md will not have — and the preview is
 * development-only (see App.tsx), so its strings are not product copy and must not ship as if
 * they were.
 *
 * Change these freely. Nothing reads them but the swatch board.
 */
export const SPECIMEN = {
  /** The board's own controls. */
  fontLabel: "ฟอนต์",
  paletteLabel: "สีหลัก",
  toLightMode: "โหมดสว่าง",
  toDarkMode: "โหมดมืด",

  /** A hero, as the product's front page arranges one. */
  badge: "ต้นแบบเชิงวิชาการ",
  tagline: "วิเคราะห์จากหลักฐานจริง ครบทุกจังหวัดทั่วประเทศ พร้อมบอกตรง ๆ ว่าอะไรที่ยังไม่รู้",
  primaryAction: "เริ่มวิเคราะห์",

  /** A result header. The place and the concept are invented. */
  place: "ต.บางปลาสร้อย อ.เมืองชลบุรี จ.ชลบุรี",
  concept: "ที่พักอาศัยให้เช่า",
  scopeBadge: "ระดับพื้นที่ (AREA)",

  disclaimerLead: "ผลนี้เป็นการศึกษาเบื้องต้นทางวิชาการ",
  disclaimerBody:
    "จัดทำโดยระบบต้นแบบสำหรับโครงการมหาวิทยาลัย ไม่ใช่คำรับรองทางกฎหมาย วิศวกรรม การสำรวจ การประเมินราคา หรือคำแนะนำการลงทุน ต้องตรวจสอบกับผู้เชี่ยวชาญก่อนตัดสินใจจริง",

  statusHeading: "สถานะการตรวจสอบ",
  statusNote:
    "สีสถานะไม่เปลี่ยนตามสีหลักของแอป เพราะสื่อความหมายเชิงวิเคราะห์ ไม่ใช่การตกแต่ง และ “ไม่ทราบ” ใช้สีเทาไร้สีสันโดยตั้งใจ เพื่อไม่ให้ดูเหมือน “เกือบไม่ผ่าน”",
  statusLabels: {
    PASS: "ผ่าน",
    FAIL: "ไม่ผ่าน",
    PARTIAL: "ผ่านบางส่วน",
    UNKNOWN: "ไม่ทราบ",
  },

  navHeading: "แถบนำทางผลลัพธ์",
  navNote: "หน้าตาเหมือนแท็บ แต่กดแล้วเลื่อนไปยังหัวข้อในหน้าเดียวกัน — ข้อจำกัดและหลักฐานแย้งจึงไม่ถูกซ่อน",
  sections: [
    "สรุปคำแนะนำ",
    "หลักฐานสนับสนุน",
    "หลักฐานแย้ง",
    "ผลตรวจสอบ",
    "การเงิน",
    "ข้อจำกัด",
    "สิ่งที่ต้องตรวจสอบต่อ",
  ],

  /** Invented figures, chosen to be the length real ones are. */
  metrics: [
    { label: "รายได้ครัวเรือน/เดือน", value: "17,019", unit: "บาท", Icon: TrendingUp },
    { label: "ประชากรในตำบล", value: "22,480", unit: "คน", Icon: Building2 },
    { label: "หลักฐานที่ใช้ได้", value: "6", unit: "จาก 14 รายการ", Icon: FileSearch },
  ],

  evidenceHeading: "การ์ดหลักฐาน",
  evidenceTitle: "รายได้ครัวเรือนเฉลี่ยต่อเดือน",
  evidenceBadge: "หลักฐานตรง",
  evidenceValue: "17,019",
  evidenceUnit: "บาท/เดือน",
  evidenceNote: "แหล่งข้อมูลไม่ได้เผยแพร่ค่าเฉลี่ยรวมทุกครัวเรือน ระบบจึงแสดงแยกตามกลุ่ม และไม่สร้างค่าเฉลี่ยรวมขึ้นเอง",
  evidenceFields: [
    ["กลุ่มประชากร", "ผู้ถือครองทำการเกษตร (เจ้าของที่ดิน)"],
    ["ระดับพื้นที่", "จังหวัดชลบุรี"],
    ["ปีข้อมูล", "2568 (ค.ศ. 2025)"],
    ["แหล่งข้อมูล", "สำนักงานสถิติแห่งชาติ"],
  ] as ReadonlyArray<readonly [string, string]>,
} as const;
