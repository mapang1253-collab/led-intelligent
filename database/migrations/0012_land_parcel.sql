-- Cadastral parcel identity from the Land Department's open shapefiles (docs/adr/0007).
--
-- What this table is: the parcel's official identity — ระวาง and เลขที่ดิน — with the area and the
-- centre point DOL publishes for it. What it is NOT: evidence about anybody's property. Finding a
-- parcel here tells the reader where that parcel is; it does not establish that it is theirs, who
-- owns it, or what it is worth. Ownership is not in this data and this project does not hold it.
--
-- Coverage is five provinces, not seventy-seven, because those are the only ones DOL publishes
-- openly. Every read must be able to distinguish "no parcel with that number" from "this province
-- is not covered", which is why coverage is a table of its own below rather than something a
-- caller infers from an empty result.
CREATE TABLE reference.land_parcel (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- The ระวาง, split as DOL splits it: 5137 II 9854-09 is (5137, 2, 9854, '09').
  utm_map_1       text   NOT NULL,
  utm_map_2       smallint NOT NULL CHECK (utm_map_2 BETWEEN 1 AND 4),
  utm_map_3       text   NOT NULL,
  utm_map_4       text   NOT NULL,
  -- เลขที่ดิน. Text, not integer: it is an identifier within a sheet, not a quantity, and DOL
  -- pads some of them.
  land_no         text   NOT NULL,
  province_code   text   NOT NULL,
  province_name_th    text,
  district_name_th    text,
  subdistrict_name_th text,
  -- Square metres as DOL computed it from the polygon. Kept as numeric, like every other measured
  -- quantity in this database, so no read ever rounds through a float.
  area_sqm        numeric,
  -- The parcel's centre, transformed from UTM 47N at ingest. Null where DOL published no origin —
  -- a real gap in the source, not a parse failure, and rows are kept so a lookup still resolves
  -- the identity and the area.
  centroid        geography(Point, 4326),
  source          text   NOT NULL,
  ingested_at     timestamptz NOT NULL DEFAULT now(),
  -- One parcel per number per sheet. DOL republishes whole provinces, so an ingest upserts.
  CONSTRAINT land_parcel_sheet_no_key
    UNIQUE (utm_map_1, utm_map_2, utm_map_3, utm_map_4, land_no)
);

-- The lookup the search box performs, and the only one it performs.
CREATE INDEX land_parcel_sheet_lookup_idx
  ON reference.land_parcel (utm_map_1, utm_map_2, utm_map_3, utm_map_4, land_no);

-- Spatial reads go through an index, never a scan (CLAUDE.md).
CREATE INDEX land_parcel_centroid_idx
  ON reference.land_parcel USING gist (centroid);

-- Which provinces this table can answer for at all.
--
-- Without this, a lookup that found nothing in ชลบุรี would be indistinguishable from a lookup
-- that found nothing in ปทุมธานี, and the first is "we hold no data here" while the second is
-- "that parcel number does not exist". Telling a reader their deed is wrong when the truth is that
-- we never had their province is the precise failure this whole product is built to avoid.
CREATE TABLE reference.land_parcel_coverage (
  province_code text PRIMARY KEY,
  province_name_th text NOT NULL,
  dataset_name  text NOT NULL,
  licence       text NOT NULL,
  published_by  text NOT NULL,
  ingested_at   timestamptz
);

INSERT INTO reference.land_parcel_coverage
  (province_code, province_name_th, dataset_name, licence, published_by) VALUES
  ('12', 'นนทบุรี',      'landparcel-nonthaburi',     'DGA Open Government License', 'กรมที่ดิน'),
  ('13', 'ปทุมธานี',     'landparcel-pathumthani',    'DGA Open Government License', 'กรมที่ดิน'),
  ('11', 'สมุทรปราการ',  'landparcel-samutprakan',    'DGA Open Government License', 'กรมที่ดิน'),
  ('75', 'สมุทรสงคราม',  'landparcel-samutsongkhram', 'DGA Open Government License', 'กรมที่ดิน'),
  ('74', 'สมุทรสาคร',    'landparcel-samutsakhon',    'DGA Open Government License', 'กรมที่ดิน');
