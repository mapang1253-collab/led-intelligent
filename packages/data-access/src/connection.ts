import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./schema.js";

/**
 * Creates a Kysely connection. The Worker passes `env.HYPERDRIVE.connectionString`
 * (docs/technology-stack.md §8); local Node.js tooling (migrate/seed scripts) passes
 * `MIGRATION_DATABASE_URL` directly. Either way this is `pg` over `nodejs_compat` — never exposed
 * to the browser.
 */
/**
 * The database handle as the rest of the application sees it. Callers pass it around and hand it
 * back to this package's repositories; naming Kysely outside `@reis/data-access` would leak SQL
 * ownership across the module boundary (docs/technology-stack.md §4).
 */
export type Db = Kysely<Database>;

export function createDb(connectionString: string): Db {
  const pool = new pg.Pool({ connectionString, max: 1 });
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}
