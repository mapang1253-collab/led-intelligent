import { Navigate, Route, Routes } from "react-router";
import { DesignSystemPreview } from "../features/design-system/DesignSystemPreview.js";
import { HomePage } from "../features/home/HomePage.js";
import { PropertyIntakeForm } from "../features/intake/PropertyIntakeForm.js";
import { SavedAreasPage } from "../features/intake/SavedAreasPage.js";
import { RunPage } from "../features/run/RunPage.js";
import { SystemStatusPage } from "../features/status/SystemStatusPage.js";
import { AppShell } from "./AppShell.js";

/**
 * The form, on a page of its own at /analyze.
 *
 * It used to be the front page, so a reader arrived at a dropdown before anything had told them
 * what the product was for. The front page is now HomePage and this is one click in — which also
 * means the form can be the only thing on the screen, rather than the thing underneath a hero.
 */
function AnalyzePage() {
  return (
    <main className="px-6 pt-10 pb-16 lg:pt-14">
      {/* The form card carries the page's own heading; a second title above it would say the
          same thing twice. */}
      <div className="mx-auto max-w-5xl">
        <PropertyIntakeForm />
      </div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      {/*
        The design preview stands alone; everything a reader uses lives inside the shell.

        Development only. The page is a swatch board, and its numbers are invented to show what a
        figure looks like — on the deployed site a reader who reached it could take them for an
        analysis, which is the one thing this product must never serve (docs/output-policy.md).
        Vite replaces import.meta.env.DEV with false in the build, so the component is dropped
        from the bundle rather than merely hidden behind a route.
      */}
      {import.meta.env.DEV && <Route path="/design" element={<DesignSystemPreview />} />}
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/analyze" element={<AnalyzePage />} />
              <Route path="/runs/:runId" element={<RunPage />} />
              <Route path="/saved" element={<SavedAreasPage />} />
              <Route path="/status" element={<SystemStatusPage />} />
              {/*
                Anything else goes to the front page rather than to a blank shell.

                Without this, an address the router does not know rendered the top bar and nothing
                under it — which is what /design became the moment the preview stopped shipping,
                and what any mistyped URL had always done. There are four pages here; sending a
                reader to the one that starts the work is kinder than a page that looks broken.
              */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
