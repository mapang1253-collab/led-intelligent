import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Single full-stack Cloudflare project: React/Vite SPA + Hono Worker share one origin.
// See docs/technology-stack.md §1-3. No Docker, no separate dev server for the API.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
});
