import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

/**
 * The intake the reader last submitted, carried across the navigation rail.
 *
 * The form already survives the browser's Back button and the two "back to the form" links on a
 * result, because each of those navigations hands the intake along in router state. The rail does
 * not: it is rendered by the shell, which knows nothing about any run, so its "เลือกพื้นที่" link
 * went to `/analyze` with no state and the form opened empty. A reader who pressed start and then
 * reached for the rail — the one piece of navigation on every screen — lost the area, the pin, the
 * areas they had typed and the map that had been showing their city-plan colours.
 *
 * So the result page publishes its intake here and the rail reads it back. Deliberately in memory
 * only, for the life of the tab's JavaScript: this is the same data the history entries already
 * hold, not a new place where a reader's answers persist. Nothing is written to storage, nothing
 * reaches the server, and a reload starts it empty again (the result page refills it from the run
 * envelope on its next render).
 */

type Intake = Readonly<Record<string, unknown>>;

interface Carrier {
  readonly intake: Intake | null;
  readonly carry: (intake: Intake) => void;
}

const IntakeCarrierContext = createContext<Carrier>({ intake: null, carry: () => {} });

export function IntakeCarrier({ children }: { children: React.ReactNode }) {
  const [intake, setIntake] = useState<Intake | null>(null);
  const value = useMemo<Carrier>(() => ({ intake, carry: setIntake }), [intake]);
  return <IntakeCarrierContext.Provider value={value}>{children}</IntakeCarrierContext.Provider>;
}

/** What the rail should hand to `/analyze`, or null before any run has been opened. */
export function useCarriedIntake(): Intake | null {
  return useContext(IntakeCarrierContext).intake;
}

/**
 * Publish this screen's intake for the rail.
 *
 * Compared by content rather than by reference: the result page recomputes `intake` from either
 * router state or the run envelope, and setting state on every render that produced an equal
 * object would loop.
 */
export function useCarryIntake(intake: Intake | null | undefined): void {
  const { carry } = useContext(IntakeCarrierContext);
  const latest = useRef(intake);
  latest.current = intake;
  // Keyed on the content, so an equal object rebuilt on the next render does not set state again.
  const key = intake ? JSON.stringify(intake) : "";
  useEffect(() => {
    const current = latest.current;
    if (key !== "" && current) carry(current);
  }, [key, carry]);
}
