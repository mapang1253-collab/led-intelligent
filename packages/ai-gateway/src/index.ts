/**
 * @reis/ai-gateway — the ONLY package that calls Gemini (docs/technology-stack.md §4/§10,
 * docs/ai-architecture.md). Normal run: 1 concept-proposal call; at most 1 repair call;
 * AI_MAX_CALLS_PER_RUN = 2. Never called from apps/web/src/client directly.
 */
export {
  type BriefEvidenceInput,
  type BuildBriefInput,
  briefCitationIndex,
  buildOpportunityBrief,
} from "./brief.js";
export {
  type ConceptValidation,
  type ValidationIssue,
  isThaiVisibleText,
  validateConceptResponse,
} from "./concept-validation.js";
export {
  AI_MAX_CALLS_PER_RUN,
  PRIMARY_MODEL,
  type AiMode,
  type ModelCall,
  type ModelClient,
  type ModelResponse,
  type ProposeConceptsOptions,
  proposeConcepts,
} from "./gateway.js";
export {
  CONCEPT_RESPONSE_SCHEMA,
  type GeminiClientOptions,
  createGeminiClient,
} from "./gemini-client.js";
export {
  REPAIR_INSTRUCTION_TH,
  SYSTEM_INSTRUCTION_TH,
  buildConceptPrompt,
} from "./prompt.js";
