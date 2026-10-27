import type { LlmModel } from "./types";

/**
 * Calls are billed at a flat per-minute price whatever the model, so we only offer
 * models Telnyx recommends for assistants whose output price stays at or under this
 * (USD per 1M tokens). Unpriced models are skipped for the same reason.
 */
export const MAX_OUTPUT_PRICE_PER_M = 15;

/**
 * Providers whose models Telnyx only runs with the customer's own API key (`llm_api_key_ref`),
 * which we don't have: an assistant on one of these is rejected on save (verified 2026-10-21).
 */
const BRING_YOUR_OWN_KEY = ["google/"];

/**
 * The models we offer, in display order: the five that did best on accuracy, Knowledge Base search
 * and latency when all 15 catalog models ran the same Front Desk test set (2026-10-26; see
 * docs/telnyx-api-notes.md §8). A listed model still has to pass the catalog checks below.
 */
export const OFFERED_MODEL_IDS = [
  "zai-org/GLM-5.2",
  "zai-org/GLM-5.3-Flash",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.2",
  "openai/gpt-6-luna",
];

export interface CatalogModel {
  id: string;
  recommended_for_assistants?: boolean;
  pricing?: { input?: string; output?: string; unit?: string };
}

export function toOfferedModels(catalog: CatalogModel[]): LlmModel[] {
  return catalog
    .flatMap((m) => {
      const input = Number(m.pricing?.input);
      const output = Number(m.pricing?.output);
      if (!OFFERED_MODEL_IDS.includes(m.id)) return [];
      if (!m.recommended_for_assistants || m.pricing?.unit !== "1M_tokens") return [];
      if (BRING_YOUR_OWN_KEY.some((prefix) => m.id.startsWith(prefix))) return [];
      if (!Number.isFinite(input) || !Number.isFinite(output) || output > MAX_OUTPUT_PRICE_PER_M) return [];
      return [{ id: m.id, name: modelName(m.id), inputPricePerM: input, outputPricePerM: output }];
    })
    .sort((a, b) => OFFERED_MODEL_IDS.indexOf(a.id) - OFFERED_MODEL_IDS.indexOf(b.id));
}

const STT_MODEL_NAMES: Record<string, string> = {
  "assemblyai/universal-3-5-pro": "AssemblyAI Universal-3.5 Pro",
  "deepgram/nova-3": "Deepgram Nova-3",
  "deepgram/nova-2": "Deepgram Nova-2",
  "deepgram/flux": "Deepgram Flux",
};

/** Display name of a speech-recognition model id. */
export function sttModelName(id: string): string {
  return STT_MODEL_NAMES[id] ?? id;
}

/** "moonshotai/Kimi-K2.6" → "Kimi-K2.6" */
export function modelName(id: string): string {
  return id.slice(id.indexOf("/") + 1);
}

/** Mock catalog: real Telnyx entries (verified 2026-10-08, more added 2026-10-26) so mock data matches live. */
export const MOCK_MODELS: CatalogModel[] = [
  { id: "moonshotai/Kimi-K2.6", recommended_for_assistants: true, pricing: { input: "0.665000", output: "4.000000", unit: "1M_tokens" } },
  { id: "zai-org/GLM-5.2", recommended_for_assistants: true, pricing: { input: "1.000000", output: "4.000000", unit: "1M_tokens" } },
  { id: "openai/gpt-5.2", recommended_for_assistants: true, pricing: { input: "1.750000", output: "14.000000", unit: "1M_tokens" } },
  { id: "openai/gpt-6-luna", recommended_for_assistants: true, pricing: { input: "0.100000", output: "0.500000", unit: "1M_tokens" } },
  { id: "zai-org/GLM-5.3-Flash", recommended_for_assistants: true, pricing: { input: "0.135000", output: "0.450000", unit: "1M_tokens" } },
  { id: "openai/gpt-5.4-mini", recommended_for_assistants: true, pricing: { input: "0.750000", output: "4.500000", unit: "1M_tokens" } },
  { id: "anthropic/claude-haiku-4-5", recommended_for_assistants: true, pricing: { input: "1.000000", output: "5.000000", unit: "1M_tokens" } },
  { id: "openai/gpt-5.6-sol", recommended_for_assistants: true, pricing: { input: "5.000000", output: "30.000000", unit: "1M_tokens" } },
  { id: "google/gemini-2.5-flash", recommended_for_assistants: true, pricing: {} },
  { id: "google/gemini-3.7-flash", recommended_for_assistants: true, pricing: { input: "0.600000", output: "0.600000", unit: "1M_tokens" } },
  { id: "deepseek-ai/DeepSeek-V4-Flash-0731", recommended_for_assistants: false, pricing: { input: "0.13", output: "0.26", unit: "1M_tokens" } },
];
