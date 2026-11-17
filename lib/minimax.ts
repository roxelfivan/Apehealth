import type { AnalyzeResult, Confidence, Settings } from "./types";

const USER_PROMPT =
  "Estimate calories for this meal photo. Return ONLY a JSON object with these fields: description (string), calories (number, estimated total kcal), confidence (high/medium/low). Be realistic about portion sizes. If multiple items, sum them.";

function completionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}

function assertSafeEndpoint(endpoint: string): string {
  const url = completionsUrl(endpoint);
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("API endpoint is not a valid URL.");
  }
  const host = parsed.hostname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "[::1]" ||
    host === "::1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error("API endpoint must be HTTPS (or localhost).");
  }
  return parsed.toString();
}

function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJson(text: string): unknown {
  const cleaned = stripThink(text);
  const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? cleaned).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("MiniMax did not return JSON.");
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

export async function analyzeMealPhoto(
  imageDataUrl: string,
  settings: Settings,
): Promise<AnalyzeResult> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new Error("Add your MiniMax API key in Settings first.");
  }
  if (!imageDataUrl.startsWith("data:image/")) {
    throw new Error("Could not read this photo.");
  }

  const url = assertSafeEndpoint(settings.apiEndpoint);
  const model = settings.model.trim() || "MiniMax-M3";
  const usesFlash = /m3\.1/i.test(model);

  // OpenAI-compatible Chat Completions (same auth as Apeditor: Bearer key).
  // MiniMax reads photos as image_url data URLs: data:<jpeg|png|gif|webp>;base64,...
  const body: Record<string, unknown> = {
    model,
    max_completion_tokens: 1200,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: USER_PROMPT },
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
      `MiniMax request failed (${response.status}).`;
    throw new Error(message);
  }

  const content = payload?.choices?.[0]?.message
    ? messageText(payload.choices[0].message)
    : "";
  if (!content.trim()) {
    throw new Error("MiniMax returned an empty response.");
  }

  const parsed = extractJson(content) as {
    description?: unknown;
    calories?: unknown;
    confidence?: unknown;
  };

  const calories = Number(parsed.calories);
  if (!Number.isFinite(calories) || calories < 0) {
    throw new Error("Could not read a calorie number from MiniMax.");
  }

  return {
    description:
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : "Meal",
    calories: Math.round(calories),
    confidence: asConfidence(parsed.confidence),
  };
}
