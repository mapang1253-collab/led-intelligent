/**
 * @reis/scenario-engine — the deterministic economic component registry and cash-flow/sensitivity
 * calculator (docs/economic-component-registry.md, docs/scenario-engine.md). Uses `decimal.js` for
 * all money/precision math; never calls an LLM per scenario.
 */
export {
  computeFeasibility,
  type FeasibilityAssumptions,
  type FeasibilityMethod,
  type FeasibilityMethodInput,
  type FeasibilityMethodPack,
  type FeasibilityResult,
  type FeasibilityStep,
  type SensitivityRow,
} from "./feasibility.js";
