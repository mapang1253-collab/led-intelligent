/**
 * Typed Thai (th-TH) string catalog — per docs/technology-stack.md §6 / RD-10, this is the ONLY
 * place user-facing text lives. Components must import from here, never inline Thai/English
 * strings, so that wording can be reviewed in one place.
 *
 * Grouped to mirror the required components in docs/technology-stack.md §5.
 */
export const th = {
  app: {
    title: "ระบบวิเคราะห์ศักยภาพการลงทุนอสังหาริมทรัพย์",
    tagline: "วิเคราะห์จากหลักฐานจริง ครบทุกจังหวัดทั่วประเทศ พร้อมบอกตรง ๆ ว่าอะไรที่ยังไม่รู้",
    academicBadge: "ต้นแบบเชิงวิชาการ",
  },

  intake: {
    heading: "ทรัพย์สินที่ต้องการวิเคราะห์",
    description: "เลือกพื้นที่ที่ต้องการวิเคราะห์ ระบบใช้ข้อมูลเท่าที่มีจริง และจะบอกชัดเจนว่าส่วนไหนยังไม่ทราบ",

    provinceLabel: "จังหวัด",
    districtLabel: "อำเภอ/เขต",
    subdistrictLabel: "ตำบล/แขวง",

    provincePlaceholder: "เลือกจังหวัด",
    districtPlaceholder: "เลือกอำเภอ/เขต",
    subdistrictPlaceholder: "เลือกตำบล/แขวง",

    districtDisabledHint: "เลือกจังหวัดก่อน",
    subdistrictDisabledHint: "เลือกอำเภอ/เขตก่อน",

    optionalToggle: "เพิ่มรายละเอียดทรัพย์สิน (ไม่บังคับ)",
    optionalHelp: "ยิ่งระบุได้ละเอียด ผลวิเคราะห์ยิ่งเจาะจงขึ้น หากไม่ระบุ ระบบจะวิเคราะห์ในระดับพื้นที่แทน",

    addressLabel: "ที่อยู่/ถนน/ซอย",
    addressPlaceholder: "เช่น 123 ถนนสุขุมวิท",
    titleDeedLabel: "เลขที่โฉนด",
    mapSheetLabel: "ระวาง",
    landNumberLabel: "เลขที่ดิน",
    landAreaLabel: "เนื้อที่",
    raiUnit: "ไร่",
    nganUnit: "งาน",
    waUnit: "ตารางวา",

    submit: "เริ่มวิเคราะห์",
    submitting: "กำลังส่งข้อมูล",

    scopeNoticeTitle: "ขอบเขตของผลที่จะได้รับ",
    scopeNoticeArea: "ระบุเฉพาะพื้นที่ — จะได้การวิเคราะห์ศักยภาพระดับพื้นที่ ไม่ใช่ข้อสรุปเฉพาะแปลงที่ดิน",
    scopeNoticeProperty: "มีข้อมูลเฉพาะทรัพย์ — ระบบจะพยายามวิเคราะห์ในระดับทรัพย์ เท่าที่หลักฐานรองรับ",
  },

  validation: {
    provinceRequired: "กรุณาเลือกจังหวัด",
    districtRequired: "กรุณาเลือกอำเภอ/เขต",
    subdistrictRequired: "กรุณาเลือกตำบล/แขวง",
    numberInvalid: "กรุณากรอกเป็นตัวเลข",
  },

  progress: {
    heading: "กำลังวิเคราะห์",
    queued: "รอคิวการวิเคราะห์",
    running: "กำลังวิเคราะห์ข้อมูล",
    cancel: "ยกเลิกการวิเคราะห์",
    backToIntake: "กลับไปหน้ากรอกข้อมูล",
    expiresAt: "ผลลัพธ์นี้จะหมดอายุ",
    targetHeading: "พื้นที่ที่วิเคราะห์",
    stageHeading: "ขั้นตอนการทำงาน",
    stageSucceeded: "เสร็จแล้ว",
    stageSkipped: "ยังไม่เปิดใช้งาน",
    stageRunning: "กำลังทำงาน",
    stagePending: "รอดำเนินการ",
    stage: {
      TARGET_RESOLUTION: "ระบุพื้นที่เป้าหมาย",
      EVIDENCE_ACQUISITION: "รวบรวมหลักฐาน",
      VALIDATION: "ตรวจสอบกฎหมาย/กายภาพ/ดีมานด์",
      SCENARIO: "คำนวณความเป็นไปได้ทางการเงิน",
      COMPARISON: "เปรียบเทียบและสรุปผล",
    },
  },

  runState: {
    QUEUED: "รอคิว",
    RUNNING: "กำลังวิเคราะห์",
    COMPLETE: "เสร็จสมบูรณ์",
    PARTIAL: "ได้ผลบางส่วน",
    FAILED_RETRYABLE: "เกิดข้อผิดพลาด ลองใหม่ได้",
    FAILED_FINAL: "ทำงานไม่สำเร็จ",
    EXPIRED: "หมดอายุแล้ว",
    CANCELLED: "ยกเลิกแล้ว",
  },

  notActivated: {
    heading: "ยังไม่มีผลวิเคราะห์",
    body: "ระบบระบุพื้นที่เป้าหมายได้แล้ว แต่ขั้นตอนรวบรวมหลักฐาน ตรวจสอบ และวิเคราะห์การเงิน ยังไม่เปิดใช้งาน จึงยังไม่มีข้อสรุปหรือคำแนะนำใด ๆ ให้แสดง",
    why: "ระบบจะไม่แสดงคำแนะนำจนกว่าจะมีหลักฐานรองรับจริง การเดาแทนจึงไม่ใช่ทางเลือก",
  },

  expired: {
    heading: "ผลการวิเคราะห์นี้หมดอายุแล้ว",
    body: "ผลลัพธ์แต่ละครั้งเก็บไว้ 24 ชั่วโมงเท่านั้น และไม่มีการบันทึกประวัติย้อนหลัง กรุณาเริ่มวิเคราะห์ใหม่",
  },

  error: {
    generic: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
    loadAreasFailed: "โหลดข้อมูลพื้นที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    retry: "ลองใหม่",
  },

  common: {
    loading: "กำลังโหลด",
    required: "จำเป็น",
  },
} as const;

export type ThaiCatalog = typeof th;
