/**
 * @reis/data-access — the only package that owns SQL and transaction boundaries
 * (docs/technology-stack.md §4). Workers connect through Hyperdrive using `pg` + Kysely;
 * SQL migrations under database/migrations/ are the schema authority, not this file.
 *
 * WP1-2 scaffold. Kysely `Database` interface, connection factory and typed repositories land
 * with the admin-area/evidence schema (Day 2-3 of the current increment).
 */
export {};
