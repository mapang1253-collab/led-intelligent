-- How a province's parcel layer is addressed, kept so the department is asked once (docs/adr/0009).
--
-- The problem this solves is reliability, not speed, and it was measured rather than guessed. A
-- cold parcel lookup is three requests to DPT: which layer holds the parcels, how that layer
-- spells and types its columns, and then the parcel itself. From a Cloudflare colo close to
-- Bangkok each takes about 0.6 seconds. From Singapore each takes over seven, and on 2026-10-08
-- every lookup routed through there failed — not because DPT refused, but because three slow
-- requests in a row could not finish inside any sane budget. Two of those three ask a question
-- whose answer never changes: ภูเก็ต's parcels are on layer 0, นครนายก spells the column `land_no`,
-- ปัตตานี stores เลขที่ดิน as an integer.
--
-- The edge cache in front of this already held the answer, but `caches.default` is per colo, so
-- every colo starts cold and pays all three. This is the copy every colo can read.
--
-- What is stored is published metadata about a province's own service. NOT the ระวาง or the
-- เลขที่ดิน anyone searched for: those are the reader's, they are never written anywhere, and the
-- parcel query itself still goes out live on every lookup.
CREATE TABLE reference.dpt_parcel_layer (
  -- Two digits, as DPT names its services: PLLU83 is ภูเก็ต.
  province_code     text NOT NULL,
  -- Which layer of that MapServer holds the parcels. 0 in ภูเก็ต, 26 in พิษณุโลก.
  layer_id          integer NOT NULL,
  -- `LAND_NO` almost everywhere, `land_no` in นครนายก.
  land_field        text NOT NULL,
  -- Whether เลขที่ดิน is quoted in a where clause. ปัตตานี stores it as an integer and rejects a
  -- quoted one with "Failed to execute query", which reads exactly like "no such parcel".
  land_quoted       boolean NOT NULL,
  map2_quoted       boolean NOT NULL,
  -- Null where the province publishes no area, no names, or DPT's other spelling is absent.
  area_field        text,
  province_field    text,
  district_field    text,
  subdistrict_field text,
  -- When this was read, so a stale row can be found and refreshed deliberately rather than
  -- expiring on a timer. A department renumbering its layers is not an event we can schedule.
  fetched_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dpt_parcel_layer_pkey PRIMARY KEY (province_code),
  CONSTRAINT dpt_parcel_layer_province_code_is_two_digits CHECK (province_code ~ '^[0-9]{2}$'),
  CONSTRAINT dpt_parcel_layer_id_not_negative CHECK (layer_id >= 0)
);

COMMENT ON TABLE reference.dpt_parcel_layer IS
  'Public metadata about each province''s DPT parcel layer: which layer, and how its columns are '
  'spelled and typed. Contains no user data — the parcel query itself is still live. See '
  'docs/adr/0009.';
