import { th } from "@reis/i18n";
import { Building2 } from "lucide-react";
import { Route, Routes } from "react-router";
import { DesignSystemPreview } from "../features/design-system/DesignSystemPreview.js";
import { TerrainBackdrop } from "../features/design-system/TerrainBackdrop.js";
import { PropertyIntakeForm } from "../features/intake/PropertyIntakeForm.js";
import { RunPage } from "../features/run/RunPage.js";

function IntakePage() {
  return (
    <div className="relative min-h-screen text-ink">
      <TerrainBackdrop />

      <header className="px-6 pt-16 pb-10">
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
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<IntakePage />} />
      <Route path="/runs/:runId" element={<RunPage />} />
      <Route path="/design" element={<DesignSystemPreview />} />
    </Routes>
  );
}
