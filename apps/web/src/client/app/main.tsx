import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App.js";
import "../styles/global.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root element not found in index.html");
}

/**
 * Retry once: administrative-area lookups are safe to repeat, but the interactive budget in
 * docs/performance-and-reliability.md §7 does not allow long retry chains on the request path.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
