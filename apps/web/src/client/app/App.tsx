import { th } from "@reis/i18n";
import { Route, Routes } from "react-router";
import { DesignSystemPreview } from "../features/design-system/DesignSystemPreview.js";

function IntakePlaceholder() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
      <div className="max-w-md text-center">
        <h1 className="font-semibold text-xl">{th.app.title}</h1>
        <p className="mt-2 text-ink-muted text-sm">กำลังพัฒนา — หน้ากรอกข้อมูลทรัพย์สิน</p>
        <a className="mt-4 inline-block text-primary underline" href="/design">
          ดูระบบออกแบบ (design system)
        </a>
      </div>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<IntakePlaceholder />} />
      <Route path="/design" element={<DesignSystemPreview />} />
    </Routes>
  );
}
