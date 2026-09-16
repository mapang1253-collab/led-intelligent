/**
 * Shared ingestion plumbing: register a source product and a retrieved version, then write
 * observations as a set (docs/data-architecture.md §7-8).
 *
 * Registering or refreshing a product deliberately never touches its activation state. Whether a
 * source may run is a separate, reviewed decision (docs/implementation-plan.md §4), and an ingestion
 * tool is not the place to make it — the columns are simply absent from the writes below.
 */

/**
 * Compares published figures as decimals, so 17019 and "17019.0" are one value, not two.
 *
 * An absent bound normalises to the empty string whether it arrives as SQL NULL or as a missing
 * property, so a scalar figure compares equal to itself across runs instead of looking changed
 * because one side said "null" and the other "undefined".
 */
export function normalizeDecimal(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value).trim();
  return text.includes(".") ? text.replace(/0+$/, "").replace(/\.$/, "") : text;
}

export async function registerProduct(client, product) {
  const owner = await client.query(
    `INSERT INTO source.source_owner (owner_id, name_th, contact) VALUES ($1, $2, $3)
     ON CONFLICT (owner_id) DO UPDATE SET name_th = EXCLUDED.name_th, contact = EXCLUDED.contact
     RETURNING id`,
    [product.owner_id, product.owner_name_th, product.owner_contact ?? null],
  );

  const row = await client.query(
    `INSERT INTO source.source_product (
       product_id, owner_id, title_th, access_url, catalogue_url, licence_id, attribution_th,
       may_acquire, may_store, may_transform, may_display,
       coverage_level, coverage_note_th, refresh_frequency, must_not_become_th
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT (product_id) DO UPDATE SET
       title_th = EXCLUDED.title_th, access_url = EXCLUDED.access_url,
       catalogue_url = EXCLUDED.catalogue_url, licence_id = EXCLUDED.licence_id,
       attribution_th = EXCLUDED.attribution_th, may_acquire = EXCLUDED.may_acquire,
       may_store = EXCLUDED.may_store, may_transform = EXCLUDED.may_transform,
       may_display = EXCLUDED.may_display, coverage_level = EXCLUDED.coverage_level,
       coverage_note_th = EXCLUDED.coverage_note_th,
       refresh_frequency = EXCLUDED.refresh_frequency,
       must_not_become_th = EXCLUDED.must_not_become_th, updated_at = now()
     RETURNING id, activation_state`,
    [
      product.product_id,
      owner.rows[0].id,
      product.title_th,
      product.access_url,
      product.catalogue_url ?? null,
      product.licence_id,
      product.attribution_th,
      product.may_acquire,
      product.may_store,
      product.may_transform,
      product.may_display,
      product.coverage_level,
      product.coverage_note_th,
      product.refresh_frequency,
      product.must_not_become_th,
    ],
  );
  return row.rows[0];
}

/**
 * Records one acquisition. The payload hash is the version label, so re-running against an
 * unchanged publication re-uses the version row instead of inventing a new vintage.
 */
export async function registerVersion(client, sourceProductId, version) {
  const row = await client.query(
    `INSERT INTO source.product_version (
       source_product_id, version_label, record_count, payload_sha256, payload_bytes,
       parse_status, parser_version
     ) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (source_product_id, version_label) DO UPDATE SET retrieved_at = now()
     RETURNING id, retrieved_at`,
    [
      sourceProductId,
      version.label,
      version.recordCount,
      version.sha256,
      version.bytes,
      version.parseStatus,
      version.parserVersion,
    ],
  );
  return row.rows[0];
}

/**
 * Writes observations as a set: one read of the standing corpus, then bulk writes. A round trip per
 * observation would be tens of thousands of them against a hosted database.
 *
 * Supersession is append-only. An unchanged figure has its provenance refreshed; a changed one gets
 * a new version row and the old one stops being current, so history stays readable.
 */
export async function upsertObservations(client, options) {
  const { measureId, unitCode, currency, statistic, versionId, retrievedAt, rows, retireMissing } =
    options;

  const standing = new Map(
    (
      await client.query(
        `SELECT o.id, o.observation_key, o.observation_version,
                v.value_scalar::text AS value_scalar,
                v.value_low::text AS value_low, v.value_high::text AS value_high,
                v.unit_code
           FROM evidence.observation o
           JOIN evidence.observation_value v ON v.observation_id = o.id
          WHERE o.measure_id = $1 AND o.is_current`,
        [measureId],
      )
    ).rows.map((row) => [row.observation_key, row]),
  );

  const unchangedIds = [];
  const supersededIds = [];
  const fresh = [];
  let idByKey = new Map();

  for (const row of rows) {
    const current = standing.get(row.key);
    // A figure is unchanged only if it is still the same KIND of figure. A scalar that became a
    // range, or a range whose either bound moved, is a new version — comparing only the scalar
    // would silently keep a stale range standing.
    const sameValue =
      current !== undefined &&
      current.unit_code === unitCode &&
      normalizeDecimal(current.value_scalar) === normalizeDecimal(row.value) &&
      normalizeDecimal(current.value_low) === normalizeDecimal(row.valueLow) &&
      normalizeDecimal(current.value_high) === normalizeDecimal(row.valueHigh);
    if (sameValue) {
      unchangedIds.push(current.id);
      continue;
    }
    if (current !== undefined) {
      supersededIds.push(current.id);
    }
    fresh.push({
      ...row,
      version: current ? current.observation_version + 1 : 1,
      supersedes: current ? current.id : null,
    });
  }

  if (unchangedIds.length > 0) {
    // Same figure, restated by the same source: refresh provenance only. The period is part of the
    // key and therefore cannot have changed.
    await client.query(
      `UPDATE evidence.observation SET retrieved_at = $2, source_product_version_id = $3
        WHERE id = ANY($1::bigint[])`,
      [unchangedIds, retrievedAt, versionId],
    );
  }
  if (supersededIds.length > 0) {
    await client.query(
      "UPDATE evidence.observation SET is_current = false WHERE id = ANY($1::bigint[])",
      [supersededIds],
    );
  }

  if (fresh.length > 0) {
    const inserted = await client.query(
      `INSERT INTO evidence.observation (
         observation_key, observation_version, supersedes_id, is_current, subject_type,
         measure_id, population_th, admin_area_id, geography_level,
         period_start_year, period_end_year, source_vintage, retrieved_at, epistemic_status,
         source_product_version_id, source_record_locator, extraction_method,
         reliability, completeness, parsing_flags, source_note_th
       )
       SELECT t.observation_key, t.observation_version, t.supersedes_id, true, 'ADMIN_AREA',
              $12::text, t.population_th, t.admin_area_id, t.geography_level,
              t.period_start_year, t.period_end_year, t.source_vintage, $13::timestamptz,
              t.epistemic_status, $14::bigint, t.source_record_locator, t.extraction_method,
              t.reliability, t.completeness,
              -- Derived here rather than passed as a nested array: the flag is exactly "the source
              -- attached a note to this figure".
              CASE WHEN t.source_note_th IS NULL THEN '{}'::text[] ELSE ARRAY['SOURCE_FOOTNOTE'] END,
              t.source_note_th
         FROM unnest(
           $1::text[], $2::int[], $3::bigint[],
           $4::text[], $5::bigint[], $6::text[],
           $7::int[], $8::int[], $9::text[], $10::text[], $11::text[],
           $15::text[], $16::text[], $17::text[], $18::text[]
         ) AS t(
           observation_key, observation_version, supersedes_id,
           population_th, admin_area_id, geography_level,
           period_start_year, period_end_year, source_vintage, epistemic_status,
           source_record_locator, extraction_method, reliability, completeness,
           source_note_th
         )
       RETURNING id, observation_key`,
      [
        fresh.map((r) => r.key),
        fresh.map((r) => r.version),
        fresh.map((r) => r.supersedes),
        fresh.map((r) => r.populationTh),
        fresh.map((r) => r.adminAreaId),
        fresh.map((r) => r.geographyLevel),
        fresh.map((r) => r.periodStartYear),
        fresh.map((r) => r.periodEndYear),
        fresh.map((r) => r.sourceVintage),
        fresh.map((r) => r.epistemicStatus),
        fresh.map((r) => r.locator),
        measureId,
        retrievedAt,
        versionId,
        fresh.map((r) => r.extractionMethod),
        fresh.map((r) => r.reliability),
        fresh.map((r) => r.completeness),
        fresh.map((r) => r.sourceNoteTh ?? null),
      ],
    );

    idByKey = new Map(inserted.rows.map((row) => [row.observation_key, row.id]));
    // Exactly one representation per figure, enforced by observation_value's own CHECK: a row
    // carries either a scalar or a pair of bounds, never both and never neither.
    await client.query(
      `INSERT INTO evidence.observation_value (
         observation_id, measure_id, value_scalar, value_low, value_high,
         unit_code, currency, statistic
       )
       SELECT * FROM unnest(
         $1::bigint[], $2::text[], $3::numeric[], $4::numeric[], $5::numeric[],
         $6::text[], $7::text[], $8::text[]
       )`,
      [
        fresh.map((r) => idByKey.get(r.key)),
        fresh.map(() => measureId),
        fresh.map((r) => r.value ?? null),
        fresh.map((r) => r.valueLow ?? null),
        fresh.map((r) => r.valueHigh ?? null),
        fresh.map(() => unitCode),
        fresh.map(() => currency ?? null),
        fresh.map(() => statistic),
      ],
    );
  }

  /**
   * For a source ingested as one whole corpus, a figure that this run did not write is a figure the
   * publisher no longer lists — or, more often, one whose natural key changed shape because the
   * parser changed. Either way it must stop being current: leaving it standing is how one file
   * quietly becomes two copies of itself under two different cohort names.
   *
   * Opt-in, because it is only true of full-corpus ingests. A source fetched per province would
   * retire the other seventy-six every time.
   */
  let retired = 0;
  if (retireMissing) {
    const written = [...unchangedIds, ...fresh.map((r) => idByKey.get(r.key))].filter(Boolean);
    const result = await client.query(
      `UPDATE evidence.observation SET is_current = false
        WHERE measure_id = $1 AND is_current AND NOT (id = ANY($2::bigint[]))`,
      [measureId, written],
    );
    retired = result.rowCount ?? 0;
  }

  return {
    inserted: fresh.length,
    superseded: supersededIds.length,
    unchanged: unchangedIds.length,
    retired,
  };
}
