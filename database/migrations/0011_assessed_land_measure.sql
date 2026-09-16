-- Controlled vocabulary for Treasury assessed land values on non-title-deed land
-- (docs/data-architecture.md §2).
--
-- A new unit, because this is the first measure priced by ตารางวา rather than ตารางเมตร. The Thai
-- land measure is fixed by ประมวลกฎหมายที่ดิน (1 ตารางวา = 4 ตารางเมตร); the two are never mixed in
-- one column, and the conversion belongs to the reviewed valuation method, not to a read query.
INSERT INTO reference.unit (code, name_th, kind) VALUES
  ('THB_PER_SQWA', 'บาทต่อตารางวา', 'CURRENCY');

-- statistic is RANGE for the same reason as the condominium measure: one land unit can carry two
-- published prices in one area, for separate blocks the flattened export cannot tell apart.
--
-- The note carries the scope limit rather than only the tax-versus-market one, because this measure
-- has a second way to mislead: it prices land that is NOT on a title deed, and most urban land is.
INSERT INTO reference.measure_definition
  (measure_id, definition_version, name_th, measure_type, statistic, unit_code, note_th) VALUES
  (
    'assessed_land_value_per_sqwa', 1,
    'ราคาประเมินที่ดินต่อตารางวา', 'official_assessment', 'RANGE', 'THB_PER_SQWA',
    'ราคาที่ราชการกำหนดเพื่อใช้จัดเก็บภาษีและค่าธรรมเนียม สำหรับที่ดินที่มีเอกสารสิทธิประเภทอื่นนอกเหนือจากโฉนดที่ดินและ น.ส.3 ก. จำแนกตามหน่วยที่ดิน เช่น ที่ดินติดทางหลวงแผ่นดิน หรือที่ดินนอกเหนือจากหน่วยอื่น ไม่ใช่ราคาของที่ดินมีโฉนด และไม่ใช่ราคาซื้อขายในตลาด'
  );
