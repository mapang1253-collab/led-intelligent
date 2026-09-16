-- Controlled vocabulary for Treasury assessed condominium values (docs/data-architecture.md §2).
--
-- Same measure_type as the construction schedule — `official_assessment`, never `appraisal` — but
-- this one is riskier to read, because its cohort names a building someone can walk past rather
-- than a category. The note therefore says outright what the figure is not.

-- RANGE joins the controlled statistics. Both tables that carry a statistic must agree on the
-- vocabulary, or an observation could be described one way and its value another.
--
-- The range needs no new column: evidence.observation_value has held value_low/value_high since
-- migration 0003, with a CHECK that exactly one representation is used and another that the bounds
-- are ordered. Those constraints are what make a range safe to store, and they are the reason the
-- condominium source can keep the spread the publisher set instead of averaging it away.
ALTER TABLE reference.measure_definition
  DROP CONSTRAINT measure_definition_statistic_check;
ALTER TABLE reference.measure_definition
  ADD CONSTRAINT measure_definition_statistic_check
  CHECK (statistic IN ('MEAN', 'MEDIAN', 'TOTAL', 'RATE', 'SHARE', 'SINGLE', 'RANGE'));

ALTER TABLE evidence.observation_value
  DROP CONSTRAINT observation_value_statistic_check;
ALTER TABLE evidence.observation_value
  ADD CONSTRAINT observation_value_statistic_check
  CHECK (statistic IN ('MEAN', 'MEDIAN', 'TOTAL', 'RATE', 'SHARE', 'SINGLE', 'RANGE'));

INSERT INTO reference.measure_definition
  (measure_id, definition_version, name_th, measure_type, statistic, unit_code, note_th) VALUES
  (
    'assessed_condominium_value_per_sqm', 1,
    'ราคาประเมินห้องชุดต่อตารางเมตร', 'official_assessment', 'RANGE', 'THB_PER_SQM',
    'ราคาที่ราชการกำหนดเพื่อใช้จัดเก็บภาษี จำแนกตามอาคารชุดและประเภทการใช้ประโยชน์ ค่าที่แสดงเป็นช่วงราคาระหว่างชั้นต่ำสุดถึงชั้นสูงสุดที่แหล่งข้อมูลประกาศไว้ ไม่ใช่ราคาซื้อขายในตลาด และไม่ได้ระบุว่าชั้นใดมีราคาเท่าใด'
  );
