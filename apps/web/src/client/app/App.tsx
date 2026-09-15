import { th } from "@reis/i18n";

/**
 * Day 1 placeholder shell. Real screens (PropertyIntakeForm, AnalysisProgress, ResultHeader, ...
 * per docs/technology-stack.md §5) land starting Day 7-8 of the current increment, once the
 * intake → evidence → AI-concept pipeline has something real to submit to.
 */
export function App() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-neutral-900">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">{th.app.title}</h1>
        <p className="mt-2 text-sm text-neutral-500">กำลังพัฒนา — โครงสร้างเริ่มต้นของระบบ</p>
      </div>
    </main>
  );
}
