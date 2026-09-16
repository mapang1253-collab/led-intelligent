/**
 * @reis/validation-engine — legal/physical/demand requirement evaluation
 * (docs/validation-architecture.md): PASS | FAIL | PARTIAL | UNKNOWN, never coercing UNKNOWN to FAIL.
 *
 * Built so far: the legal screen. Physical and demand validation follow the same status model and
 * are not yet implemented (docs/adr/0001-first-increment-scope.md).
 */
export {
  type PackIntegrity,
  canonicalPackContent,
  computePackHash,
  verifyPackIntegrity,
} from "./pack-integrity.js";
export {
  LEGAL_VALIDATOR_VERSION,
  type LegalValidationTarget,
  packIsExecutable,
  validateLegal,
} from "./legal-validator.js";
