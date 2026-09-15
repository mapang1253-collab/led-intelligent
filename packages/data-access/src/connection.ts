import { Kysely, PostgresDialect } from "kysely";
import pg from "pg";
import type { Database } from "./schema.js";

/**
 * Creates a Kysely connection. The Worker passes `env.HYPERDRIVE.connectionString`
 * (docs/technology-stack.md §8); local Node.js tooling (migrate/seed scripts) passes
 * `MIGRATION_DATABASE_URL` directly. Either way this is `pg` over `nodejs_compat` — never exposed
 * to the browser.
 */
export function createDb(connectionString: string): Kysely<Database> {
  const pool = new pg.Pool({ connectionString, max: 1 });
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  });
}
