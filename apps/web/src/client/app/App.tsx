import { th } from "@reis/i18n";
import { Building2 } from "lucide-react";
import { Route, Routes } from "react-router";
import { DesignSystemPreview } from "../features/design-system/DesignSystemPreview.js";
import { PropertyIntakeForm } from "../features/intake/PropertyIntakeForm.js";
import { RunPage } from "../features/run/RunPage.js";
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
            ที่ดินแปลงนี้
            <br />
            <span className="headline-gradient">ใช้ทำอะไรได้คุ้มที่สุด</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-ink-muted">{th.app.tagline}</p>
        </div>
      </header>

      <main className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <PropertyIntakeForm />
        </div>
      </main>
    </>
  );
}

export function App() {
  return (
    <Routes>
      {/* The design preview stands alone; everything a reader uses lives inside the shell. */}
      <Route path="/design" element={<DesignSystemPreview />} />
      <Route
        path="*"
        element={
          <AppShell>
            <Routes>
              <Route path="/" element={<IntakePage />} />
              <Route path="/runs/:runId" element={<RunPage />} />
            </Routes>
          </AppShell>
        }
      />
    </Routes>
  );
}
