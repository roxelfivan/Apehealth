import { translate, type Locale } from "./i18n/translate";
import {
  asNonNegativeNumber,
  parseFoodItems,
  roundCalories,
  roundGrams,
  sumItemCalories,
  sumItemGrams,
} from "./nutrition";
import { PROVIDER_DEFS } from "./providers";
import type { AnalyzeResult, Confidence, ProviderConfig } from "./types";

const PROVIDER = PROVIDER_DEFS.gemini.label;

/**
 * Prompt sent to Gemini. The response language is driven by the user's
 * locale so a Traditional Chinese user gets a Traditional Chinese analysis
 * (description and food item names included).
 */
const USER_PROMPT_EN =
  "Estimate calories and nutrition for this meal photo. Return ONLY a JSON object with: description (string), calories (number, total kcal), protein (grams), carbs (grams), fat (grams), confidence (high/medium/low), and items (array of {name, calories, carbs, protein, fat}). Split visible foods into separate items, including oils, dressings, and sauces. Be realistic about portion sizes. Totals should match the sum of items.";

const USER_PROMPT_ZH_HANT =
  "估算這張餐點照片的熱量與營養成分。只回傳一個 JSON 物件，包含：description (字串，使用繁體中文)、calories (數字，總大卡數)、protein (公克)、carbs (公克)、fat (公克)、confidence (high/medium/low)、items (陣列，每個元素為 {name, calories, carbs, protein, fat})。description 與 items 中的 name 必須使用繁體中文撰寫。請將看得見的食物拆成個別項目，包含油脂、醬料與淋醬。份量請符合實際情況。總量應等於所有項目的加總。";

function userPrompt(locale: Locale): string {
  return locale === "zh-Hant" ? USER_PROMPT_ZH_HANT : USER_PROMPT_EN;
}

/**
 * Build the generateContent URL. The endpoint may be given as the bare API
 * root, or already include the `models/{model}:generateContent` suffix.
 */
export function geminiUrl(endpoint: string, model: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (trimmed.includes(":generateContent")) return trimmed;
  const cleanModel = model.trim().replace(/^models\//, "");
  return `${trimmed}/models/${cleanModel}:generateContent`;
}

/** Validate the endpoint root and return it without a trailing slash. */
export function assertSafeEndpoint(endpoint: string, locale: Locale): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(translate(locale, "errors.invalidEndpoint"));
  }
  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error(translate(locale, "errors.insecureEndpoint"));
  }
  return trimmed;
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJson(text: string, locale: Locale): unknown {
  const cleaned = stripThink(text);
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? cleaned).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(translate(locale, "errors.noJson", { provider: PROVIDER }));
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function asConfidence(value: unknown): Confidence {
  if (value === "high" || value === "medium" || value === "low") return value;
  return "medium";
}

/** Split a `data:` URL into its mime type and raw base64 payload. */
function splitDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match) {
    return { mimeType: "image/jpeg", base64: dataUrl };
  }
  const mimeType = match[1] || "image/jpeg";
  const base64 = match[3] ?? "";
  return { mimeType, base64 };
}

export type GeminiCallOptions = {
  imageDataUrl: string;
  locale: Locale;
  config: ProviderConfig;
};

export async function analyzeMealPhotoGemini(
  imageDataUrl: string,
  config: ProviderConfig,
  locale: Locale,
): Promise<AnalyzeResult> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error(translate(locale, "errors.missingApiKey", { provider: PROVIDER }));
  }
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error(translate(locale, "errors.couldNotReadPhoto"));
  }

  const endpoint = assertSafeEndpoint(config.apiEndpoint, locale);
  const model = config.model.trim() || PROVIDER_DEFS.gemini.model;
  const url = geminiUrl(endpoint, model);
  const { mimeType, base64 } = splitDataUrl(imageDataUrl);

  // Gemini generateContent API: inline image bytes + a text part.
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          { text: userPrompt(locale) },
          { inlineData: { mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: unknown; thought?: boolean }> };
          finishReason?: string;
        }>;
        promptFeedback?: { blockReason?: string };
        error?: { message?: string };
      }
    | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      translate(locale, "errors.requestFailed", {
        status: response.status,
        provider: PROVIDER,
      });
    throw new Error(message);
  }

  if (payload?.promptFeedback?.blockReason) {
    throw new Error(
      payload.promptFeedback.blockReason === "SAFETY"
        ? translate(locale, "errors.blockedBySafety", { provider: PROVIDER })
        : translate(locale, "errors.requestFailed", {
            status: response.status,
            provider: PROVIDER,
          }),
    );
  }

  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const content = parts
    .filter((part) => part?.thought !== true)
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("")
    .trim();
  if (!content) {
    throw new Error(translate(locale, "errors.emptyResponse", { provider: PROVIDER }));
  }

  const parsed = extractJson(content, locale) as {
    description?: unknown;
    calories?: unknown;
    protein?: unknown;
    carbs?: unknown;
    carbohydrates?: unknown;
    fat?: unknown;
    items?: unknown;
    confidence?: unknown;
  };

  const items = parseFoodItems(parsed.items);
  const calories =
    asNonNegativeNumber(parsed.calories) ??
    (items.length ? sumItemCalories(items) : null);
  if (calories == null) {
    throw new Error(translate(locale, "errors.noCalories", { provider: PROVIDER }));
  }

  const protein =
    asNonNegativeNumber(parsed.protein) ??
    (items.some((item) => item.protein != null) ? sumItemGrams(items, "protein") : null);
  const carbs =
    asNonNegativeNumber(parsed.carbs ?? parsed.carbohydrates) ??
    (items.length ? sumItemGrams(items, "carbs") : null);
  const fat =
    asNonNegativeNumber(parsed.fat) ??
    (items.some((item) => item.fat != null) ? sumItemGrams(items, "fat") : null);

  return {
    description:
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : translate(locale, "common.meal"),
    calories: roundCalories(calories),
    protein: protein == null ? null : roundGrams(protein),
    carbs: carbs == null ? null : roundGrams(carbs),
    fat: fat == null ? null : roundGrams(fat),
    items,
    confidence: asConfidence(parsed.confidence),
  };
}
