import { th } from "@reis/i18n";
import { Building2 } from "lucide-react";
import { Navigate, Route, Routes } from "react-router";
import { DesignSystemPreview } from "../features/design-system/DesignSystemPreview.js";
import { LandingSections } from "../features/intake/LandingSections.js";
import { PropertyIntakeForm } from "../features/intake/PropertyIntakeForm.js";
import { SavedAreasPage } from "../features/intake/SavedAreasPage.js";
import { RunPage } from "../features/run/RunPage.js";
import { SystemStatusPage } from "../features/status/SystemStatusPage.js";
import { AppShell } from "./AppShell.js";

/** The front door: choosing where to look is the first thing the app asks for. */
function IntakePage() {
  return (
    <>
      <header className="px-6 pt-12 pb-8 lg:pt-16 lg:pb-10">
        <div className="mx-auto max-w-4xl">
          <span className="glass inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-semibold text-xs">
            <Building2 size={14} aria-hidden="true" /> {th.app.academicBadge}
          </span>
          <h1 className="mt-5 font-bold text-4xl leading-tight tracking-tight md:text-5xl">
            {th.app.headlineLead}
            <br />
            <span className="headline-gradient">{th.app.headlineAnswer}</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted">{th.app.tagline}</p>
        </div>
      </header>

      <main className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <PropertyIntakeForm />
          {/* Below the form, not above it: someone who came to analyse a plot should reach the
              form first, and someone deciding whether this is worth their time reads on. */}
          <LandingSections />
        </div>
      </main>
    </>
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
              <Route path="/" element={<IntakePage />} />
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
