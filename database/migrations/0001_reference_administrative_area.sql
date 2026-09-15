-- WP1: admin/reference foundation (docs/implementation-plan.md §2).
-- AdministrativeArea per docs/data-architecture.md §2-3: versioned province/district/subdistrict
-- identity, names, codes and hierarchy. Boundary geometry is out of scope for the current increment
-- (docs/adr/0001-first-increment-scope.md) — enable PostGIS now so later migrations (evidence,
-- location assertions) don't need a separate extension-enabling step.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE SCHEMA IF NOT EXISTS reference;

CREATE TABLE reference.administrative_area (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  level         text NOT NULL CHECK (level IN ('PROVINCE', 'DISTRICT', 'SUBDISTRICT')),
  -- Stable DOPA-style numeric code: 2 digits (province), 4 digits (district), 6 digits (subdistrict).
  code          integer NOT NULL,
  parent_id     bigint REFERENCES reference.administrative_area (id),
  name_th       text NOT NULL,
  name_en       text,
  postal_code   text,
  -- Mutable definitions get version rows with effective intervals (docs/database-design.md §2).
  valid_from    date NOT NULL DEFAULT current_date,
  valid_to      date,
  source        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT administrative_area_level_code_valid_from_key UNIQUE (level, code, valid_from),
  CONSTRAINT administrative_area_parent_required CHECK (
    (level = 'PROVINCE' AND parent_id IS NULL) OR
    (level IN ('DISTRICT', 'SUBDISTRICT') AND parent_id IS NOT NULL)
  )
);

-- Area hierarchy/name/effective lookup (docs/database-design.md §5).
CREATE INDEX administrative_area_parent_idx
  ON reference.administrative_area (parent_id, level)
  WHERE valid_to IS NULL;

CREATE INDEX administrative_area_current_lookup_idx
  ON reference.administrative_area (level, code)
  WHERE valid_to IS NULL;

CREATE INDEX administrative_area_name_th_idx
  ON reference.administrative_area (lower(name_th));
