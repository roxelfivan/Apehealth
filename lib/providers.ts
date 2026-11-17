/** AI providers the user can plug their own API key into. */
export const PROVIDERS = ["gemini", "minimax"] as const;

export type Provider = (typeof PROVIDERS)[number];

/** Gemini is the default: it is the first tab in Settings and wins on a fresh install. */
export const DEFAULT_PROVIDER: Provider = "gemini";

export type ProviderDefinition = {
  /** Brand name shown in the UI (not translated). */
  label: string;
  /** Default API endpoint, without the model path. */
  endpoint: string;
  /** Default model id. */
  model: string;
  /** Model ids offered as suggestions in Settings. */
  models: string[];
  /** Where the user creates an API key. */
  keyUrl: string;
  /** Short label for the API key link. */
  keyUrlLabel: string;
};

export const PROVIDER_DEFS: Record<Provider, ProviderDefinition> = {
  gemini: {
    label: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-3.5-flash-lite",
    models: [
      "gemini-3.5-flash-lite",
      "gemini-4-hydrogen",
      "gemini-3.8-flash",
      "gemini-4-argon",
    ],
    keyUrl: "https://aistudio.google.com/api-keys",
    keyUrlLabel: "aistudio.google.com",
  },
  minimax: {
    label: "MiniMax",
    endpoint: "https://api.minimax.io/v1",
    model: "MiniMax-M3",
    models: ["MiniMax-M3", "MiniMax-M3.1-Flash", "MiniMax-M2.7"],
    keyUrl:
      "https://platform.minimax.io/user-center/basic-information/interface-key",
    keyUrlLabel: "platform.minimax.io",
  },
};

export function isProvider(value: unknown): value is Provider {
  return (
    typeof value === "string" && (PROVIDERS as readonly string[]).includes(value)
  );
}
