import { th } from "@reis/i18n";
import { Building2, Coins, Lightbulb, Map as MapIcon } from "lucide-react";
import { Navigate, Route, Routes } from "react-router";
import { DesignSystemPreview } from "../features/design-system/DesignSystemPreview.js";
import { PlotIllustration } from "../features/design-system/PlotIllustration.js";
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
      {/*
        The first screen was a line of type on an empty background, and the owners were told it
        showed nothing. It now opens with the subject drawn beside the sentence that names it, and
        with three cards saying what a reader is actually given — each naming the department the
        figures come from, so the opening makes only claims the product can keep.

        The drawing is an axonometric diagram of nowhere (see PlotIllustration and docs/adr/0004).
        It is decoration that says what the product is about; it is not evidence, and it is not of
        anybody's land.
      */}
      <header className="px-6 pt-10 pb-8 lg:pt-14 lg:pb-10">
        <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="glass inline-flex items-center gap-1.5 rounded-pill px-3 py-1 font-semibold text-xs">
              <Building2 size={14} aria-hidden="true" /> {th.app.academicBadge}
            </span>
            <h1 className="mt-5 font-bold text-4xl leading-tight tracking-tight md:text-5xl">
              {th.app.headlineLead}
              <br />
              <span className="headline-gradient">{th.app.headlineAnswer}</span>
            </h1>
            <p className="mt-3 text-base text-ink-muted">{th.app.tagline}</p>
          </div>

          {/* Second on a phone, where the words have to come first: a drawing above the headline
              would push the sentence that explains it below the fold. */}
          <PlotIllustration className="w-full" />
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {(
            [
              [Coins, th.app.offerPricesTitle, th.app.offerPricesBody],
              [MapIcon, th.app.offerZoningTitle, th.app.offerZoningBody],
              [Lightbulb, th.app.offerConceptsTitle, th.app.offerConceptsBody],
            ] as const
          ).map(([Icon, title, body]) => (
            <article key={title} className="glass rounded-card p-5">
              <span
                className="flex size-9 items-center justify-center rounded-card"
                style={{
                  backgroundColor: "var(--color-signature-wash)",
                  color: "var(--color-signature-text)",
                }}
              >
                <Icon size={18} aria-hidden="true" />
              </span>
              <h2 className="mt-3 font-bold text-base tracking-tight">{title}</h2>
              <p className="mt-1.5 text-ink-muted text-sm leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </header>

      <main className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
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
