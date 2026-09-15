import { defineConfig } from "vitest/config";

/**
 * Vitest uses its own config rather than vite.config.ts: the Cloudflare plugin configures a dev
 * server + worker environments and cannot resolve under a test runner.
 *
 * Deliberately plugin-free for now — there are no client tests yet, and Vitest 2.x carries Vite 5
 * types while this app runs Vite 6, so adding @vitejs/plugin-react here fails typecheck on the
 * version skew. Resolve that skew (align Vitest and Vite majors) when the intake-screen component
 * tests land; Worker-side tests will additionally need `@cloudflare/vitest-pool-workers` so they
 * execute in workerd rather than Node.
 */
export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    passWithNoTests: true,
  },
});
