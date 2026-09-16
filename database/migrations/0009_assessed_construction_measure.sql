-- Controlled vocabulary for Treasury assessed construction values (docs/data-architecture.md §2).
--
-- measure_type is `official_assessment`, never `appraisal` and never anything resembling a market
-- price. The whole point of the typed vocabulary is that an assessed value can never be compared
-- with, or substituted for, a market figure (docs/data-architecture.md §4).
INSERT INTO reference.unit (code, name_th, kind) VALUES
  ('THB_PER_SQM', 'บาทต่อตารางเมตร', 'CURRENCY');

INSERT INTO reference.measure_definition
  (measure_id, definition_version, name_th, measure_type, statistic, unit_code, note_th) VALUES
  (
    'assessed_construction_value_per_sqm', 1,
    'ราคาประเมินสิ่งปลูกสร้างต่อตารางเมตร', 'official_assessment', 'SINGLE', 'THB_PER_SQM',
    'ราคาที่ราชการกำหนดเพื่อใช้จัดเก็บภาษีที่ดินและสิ่งปลูกสร้าง จำแนกตามประเภทอาคารและจังหวัด ไม่ใช่ราคาซื้อขายในตลาด และไม่ใช่ต้นทุนก่อสร้างจริง'
  );
