/**
 * @reis/domain — canonical domain entities from docs/data-architecture.md (AdministrativeArea,
 * LocationAssertion, PropertyCandidate, Observation, EvidenceLink, ...). No provider/UI imports.
 */
export {
  type AdminLevel,
  areaLabelTh,
  areaLevelNounTh,
  areaPrefixTh,
  formatTargetTh,
  isBangkok,
} from "./administrative-naming.js";
export { type PublishedFigure, figureTh, isRange } from "./observation-figure.js";
