import { GoogleGenAI } from "@google/genai";
import { ACTIVITY_IDS, BUILDING_TYPES_TH, CONCEPT_SCHEMA_VERSION } from "@reis/contracts";
import type { ModelClient, ModelResponse } from "./gateway.js";

/**
 * The Gemini client (docs/ai-architecture.md §1, §5).
 *
 * Provider failures are mapped to this project's stable reason codes here, so nothing downstream
 * ever branches on a provider message. A 429 is reported, never retried and never used to hop to a
 * different model — the quota window belongs to the deployment, not to one request.
 */

export const PRIMARY_MODEL = "gemini-3.1-flash-lite";

/**
 * Structured-output schema. It constrains the shape at the provider, but it is not the acceptance
 * test: `validateConceptResponse` re-checks everything, because a schema cannot tell whether a
 * citation refers to evidence that was actually supplied.
 */
export const CONCEPT_RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    required: [
      "schema_version",
      "locale",
      "concept_id",
      "label_th",
      "description_th",
      "supporting_reason_th",
      "uncertainty_th",
      "activity_ids",
      "unmapped_activities_th",
      "building_type_th",
      "supporting_evidence_ids",
      "demand_hypotheses",
    ],
    properties: {
      schema_version: { type: "STRING", enum: [CONCEPT_SCHEMA_VERSION] },
      locale: { type: "STRING", enum: ["th-TH"] },
      concept_id: { type: "STRING" },
      label_th: { type: "STRING" },
      description_th: { type: "STRING" },
      supporting_reason_th: { type: "STRING" },
      uncertainty_th: { type: "STRING" },
      activity_ids: { type: "ARRAY", items: { type: "STRING", enum: [...ACTIVITY_IDS] } },
      unmapped_activities_th: { type: "ARRAY", items: { type: "STRING" } },
      building_type_th: { type: "STRING", enum: [...BUILDING_TYPES_TH] },
      supporting_evidence_ids: { type: "ARRAY", items: { type: "STRING" } },
      demand_hypotheses: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          required: [
            "population_th",
            "mechanism_th",
            "supporting_evidence_ids",
            "counter_evidence_th",
          ],
          properties: {
            population_th: { type: "STRING" },
            mechanism_th: { type: "STRING" },
            supporting_evidence_ids: { type: "ARRAY", items: { type: "STRING" } },
            counter_evidence_th: { type: "STRING" },
          },
        },
      },
    },
  },
} as const;

export interface GeminiClientOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** Classifies a provider error into this project's codes; unknown failures stay unavailable. */
export function classifyProviderError(error: unknown): ModelResponse {
  const message = error instanceof Error ? error.message : String(error);
  const status =
    typeof error === "object" && error !== null && "status" in error
      ? Number((error as { status: unknown }).status)
      : Number.NaN;

  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate limit/i.test(message)) {
    // A 429 alone does not say which window filled. Google names the quota it enforced, so the
    // per-day ones are read from the message and everything else stays a rate limit: telling a
    // reader the day's allowance is gone, when it returns in a minute, is a false statement about
    // what they can do next. Neither is retried automatically — the caller stops either way.
    const perDay = /PerDay|per day|daily/i.test(message);
    return {
      outcome: "FAILED",
      code: perDay ? "AI_QUOTA_EXHAUSTED" : "AI_RATE_LIMITED",
      detail: message,
      retryable: false,
    };
  }
  if (/abort|timeout|deadline/i.test(message)) {
    return { outcome: "FAILED", code: "AI_TIMEOUT", detail: message, retryable: true };
  }
  if (status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(message)) {
    // Provider-side overload, not a fault of ours and not a quota problem. Distinguished from a
    // flat failure so the reader is told it is worth trying again rather than that it is broken.
    return { outcome: "FAILED", code: "AI_PROVIDER_BUSY", detail: message, retryable: true };
  }
  if (status === 401 || status === 403) {
    return { outcome: "FAILED", code: "AI_UNAVAILABLE", detail: message, retryable: false };
  }
  return {
    outcome: "FAILED",
    code: "AI_UNAVAILABLE",
    detail: message,
    retryable: Number.isNaN(status) || status >= 500,
  };
}

export function createGeminiClient(options: GeminiClientOptions): ModelClient {
  const ai = new GoogleGenAI({ apiKey: options.apiKey });
  const model = options.model ?? PRIMARY_MODEL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return async ({ system, prompt }) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: system,
          responseMimeType: "application/json",
          // biome-ignore lint/suspicious/noExplicitAny: the SDK's SchemaUnion is structurally wider.
          responseSchema: CONCEPT_RESPONSE_SCHEMA as any,
          temperature: 0.4,
          // The SDK types the signal against the DOM lib, which this package does not load; the
          // runtime object is the same AbortSignal in both Workers and Node.
          // biome-ignore lint/suspicious/noExplicitAny: structural mismatch between lib typings only.
          abortSignal: controller.signal as any,
        },
      });
      const text = response.text;
      if (typeof text !== "string" || text.trim() === "") {
        return {
          outcome: "FAILED",
          code: "AI_UNAVAILABLE",
          detail: "provider returned an empty response",
          retryable: true,
        };
      }
      return { outcome: "SUCCESS", text };
    } catch (error) {
      const classified = classifyProviderError(error);
      // Operator-facing only: a provider failure that reaches no log is undiagnosable in a
      // deployment. This never reaches a user and is never persisted (docs/ai-architecture.md §5
      // forbids storing provider content, not surfacing it to whoever runs the service).
      console.warn(
        `[ai-gateway] ${model} failed: ${classified.outcome === "FAILED" ? classified.code : "?"} — ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
      return classified;
    } finally {
      clearTimeout(timer);
    }
  };
}
