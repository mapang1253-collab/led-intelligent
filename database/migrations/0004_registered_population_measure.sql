-- Controlled vocabulary for DOPA registered population (docs/data-architecture.md §2).
--
-- The measure is named `registered_population`, not `population`, because that is what the register
-- actually counts: people with a house registration in the area. In tourist and industrial areas it
-- can differ sharply from the people present, and a name that hid that distinction would invite
-- exactly the wrong reading.
INSERT INTO reference.measure_definition
  (measure_id, definition_version, name_th, measure_type, statistic, unit_code, note_th) VALUES
  (
    'registered_population', 1,
    'จำนวนประชากรตามทะเบียนราษฎร', 'count', 'TOTAL', 'PERSONS',
    'นับเฉพาะผู้มีชื่ออยู่ในทะเบียนบ้านของพื้นที่นั้น ไม่ใช่จำนวนคนที่อาศัยอยู่จริง พื้นที่ท่องเที่ยวและอุตสาหกรรมมักมีประชากรแฝงที่ไม่ถูกนับ'
  );
