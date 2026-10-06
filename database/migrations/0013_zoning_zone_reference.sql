-- What a city-plan zone is, kept so the department only has to be asked once (docs/adr/0008).
--
-- The problem this solves is reliability, not speed. One zoning lookup is five requests to two DPT
-- hosts: an identify to find which zone a point is in, then the zone's colour, its ข้อกำหนด and its
-- ข้อห้าม, and sometimes a legend page for its Thai name. Four of those five answer the same
-- question every time — "what is zone 4400 of plan 1300000?" — and that answer does not depend on
-- who is asking or where they pinned. When DPT is busy, any one of them failing loses the whole
-- lookup, and the screen says it could not read the city plan at all.
--
-- The edge cache in front of this helps, but Cloudflare caches per colo, so a reader in another
-- province starts cold, and the owners met exactly that: warming the cache from one network left
-- another still failing.
--
-- What is stored is public reference data published by กรมโยธาธิการและผังเมือง: a plan code, a zone
-- code, the zone's name, its official colour and the regulation's own words. NOT the coordinate
-- anyone looked up. That distinction is deliberate — a pin is run-scoped intake, it belongs to the
-- reader, and it is deleted with the run after 24 hours
-- (docs/data-persistence-and-lifecycle.md). Nothing here can be traced to a reader or a run,
-- because the point-to-zone step is still asked live every time.
CREATE TABLE reference.dpt_zoning_zone (
  -- CB_ID in DPT's data: 1300000 is ผังเมืองรวมจังหวัดปทุมธานี.
  plan_id         text NOT NULL,
  -- PL_USE: 4400 is ชุมชน. Text, not integer — it is an identifier, not a quantity.
  zone_code       text NOT NULL,
  zone_name_th    text NOT NULL,
  -- '#rrggbb' from the publisher's own renderer. Null where the zone is drawn unfilled.
  colour          text,
  -- ข้อกำหนด, as published. Null where DPT publishes none for this zone.
  permitted_th    text,
  -- ข้อห้าม, one array entry per numbered clause, in the order the regulation gives them.
  prohibited_th   jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- When this was read from DPT, so a stale row can be found and refreshed deliberately rather
  -- than expiring on a timer. Ministerial regulations change on their own schedule, not ours.
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dpt_zoning_zone_pkey PRIMARY KEY (plan_id, zone_code),
  CONSTRAINT dpt_zoning_zone_colour_is_hex CHECK (colour IS NULL OR colour ~ '^#[0-9a-f]{6}$')
);

COMMENT ON TABLE reference.dpt_zoning_zone IS
  'Public city-plan zone reference from DPT, keyed by plan and zone code. Contains no user data: '
  'the point-to-zone lookup is still performed live. See docs/adr/0008.';
