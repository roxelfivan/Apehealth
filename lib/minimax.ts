import {
  asNonNegativeNumber,
  parseFoodItems,
  roundCalories,
  roundGrams,
  sumItemCalories,
  sumItemGrams,
} from "./nutrition";
import { translate, type Locale } from "./i18n/translate";
import { PROVIDER_DEFS } from "./providers";
import type { AnalyzeResult, Confidence, ProviderConfig } from "./types";

const PROVIDER = PROVIDER_DEFS.minimax.label;

/**
 * Prompt sent to MiniMax. The response language is driven by the user's
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

function completionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

export function assertSafeEndpoint(endpoint: string, locale: Locale): string {
  const url = completionsUrl(endpoint);
  let parsed: URL;
  try {
    parsed = new URL(url);
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
  return parsed.toString();
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

function messageText(message: {
  content?: unknown;
  reasoning_content?: unknown;
}): string {
  const { content } = message;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const joined = content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("\n")
      .trim();
    if (joined) return joined;
  }
  if (typeof message.reasoning_content === "string") {
    return message.reasoning_content;
  }
  return "";
}

export async function analyzeMealPhotoMiniMax(
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

  const url = assertSafeEndpoint(config.apiEndpoint, locale);
  const model = config.model.trim() || "MiniMax-M3";
  const usesFlash = /m3\.1/i.test(model);

  // OpenAI-compatible Chat Completions (same auth as Apeditor: Bearer key).
  // MiniMax reads photos as image_url data URLs: data:<jpeg|png|gif|webp>;base64,...
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: 2200,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt(locale) },
          {
            type: "image_url",
            image_url: {
              url: imageDataUrl,
              detail: "default",
              max_long_side_pixel: 1280,
            },
          },
        ],
      },
    ],
  };

  if (usesFlash) {
    body.reasoning_effort = "low";
  } else {
    // OpenAI-compatible extra_body: skip M3 reasoning so content is the JSON answer.
    body.thinking = { type: "disabled" };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: { content?: unknown; reasoning_content?: unknown };
        }>;
        error?: { message?: string };
        base_resp?: { status_msg?: string };
      }
    | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.base_resp?.status_msg ||
      translate(locale, "errors.requestFailed", {
        status: response.status,
        provider: PROVIDER,
      });
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message
    ? messageText(payload.choices[0].message)
    : "";
  if (!content.trim()) {
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
