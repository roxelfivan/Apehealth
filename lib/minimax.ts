import type { AnalyzeResult, Confidence, Settings } from "./types";

const USER_PROMPT =
  "Look at the attached meal photo and estimate calories for the whole meal. Return ONLY a JSON object with these fields: description (string), calories (number, estimated total for the whole meal), confidence (high/medium/low). Be realistic about portion sizes. If multiple items, sum them.";

type ImageBytes = { mediaType: string; data: string; dataUrl: string };

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

function isMiniMaxHost(hostname: string): boolean {
  return /(^|\.)minimax\.io$/i.test(hostname) || /(^|\.)minimaxi\.com$/i.test(hostname);
}

export function anthropicMessagesUrl(completions: string): string | null {
  const parsed = new URL(completions);
  if (!isMiniMaxHost(parsed.hostname)) return null;
  return `${parsed.protocol}//${parsed.host}/anthropic/v1/messages`;
}

export function splitImageDataUrl(dataUrl: string): ImageBytes {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(
    dataUrl.trim(),
  );
  if (!match) throw new Error("Could not read this photo.");
  return {
    mediaType: match[1],
    data: match[2].replace(/\s/g, ""),
    dataUrl: dataUrl.trim(),
  };
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

function openaiMessageText(message: {
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

function anthropicMessageText(payload: {
  content?: unknown;
}): string {
  const { content } = payload;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const block = part as { type?: unknown; text?: unknown };
      if (block.type === "text" && typeof block.text === "string") return block.text;
      return "";
    })
    .join("\n")
    .trim();
}

function apiErrorMessage(
  payload: {
    error?: { message?: string };
    base_resp?: { status_msg?: string };
  } | null,
  status: number,
): string {
  return (
    payload?.error?.message ||
    payload?.base_resp?.status_msg ||
    `MiniMax request failed (${status}).`
  );
}

function resultFromText(content: string): AnalyzeResult {
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

async function postJson(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; payload: Record<string, unknown> | null }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  return { ok: response.ok, status: response.status, payload };
}

function openaiBody(model: string, image: ImageBytes): Record<string, unknown> {
  const usesFlash = /m3\.1/i.test(model);
  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: image.dataUrl, detail: "low" },
          },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
  };
  if (usesFlash) body.reasoning_effort = "low";
  return body;
}

function anthropicBody(model: string, image: ImageBytes): Record<string, unknown> {
  const usesFlash = /m3\.1/i.test(model);
  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: image.mediaType,
              data: image.data,
              detail: "low",
            },
          },
          { type: "text", text: USER_PROMPT },
        ],
      },
    ],
  };
  if (usesFlash) {
    body.output_config = { effort: "low" };
  } else {
    // Anthropic MiniMax-M3 leaves thinking off unless enabled; vision needs it.
    body.thinking = { type: "adaptive" };
  }
  return body;
}

export async function analyzeMealPhoto(
  imageDataUrl: string,
  settings: Settings,
): Promise<AnalyzeResult> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new Error("Add your MiniMax API key in Settings first.");
  }

  const openaiUrl = assertSafeEndpoint(settings.apiEndpoint);
  const model = settings.model.trim() || "MiniMax-M3";
  const image = splitImageDataUrl(imageDataUrl);
  const anthropicUrl = anthropicMessagesUrl(openaiUrl);

  if (anthropicUrl) {
    const { ok, status, payload } = await postJson(
      anthropicUrl,
      apiKey,
      anthropicBody(model, image),
    );
    if (ok) {
      return resultFromText(anthropicMessageText(payload ?? {}));
    }
    if (status !== 404 && status !== 405) {
      throw new Error(
        apiErrorMessage(
          payload as {
            error?: { message?: string };
            base_resp?: { status_msg?: string };
          } | null,
          status,
        ),
      );
    }
  }

  const { ok, status, payload } = await postJson(
    openaiUrl,
    apiKey,
    openaiBody(model, image),
  );
  if (!ok) {
    throw new Error(
      apiErrorMessage(
        payload as {
          error?: { message?: string };
          base_resp?: { status_msg?: string };
        } | null,
        status,
      ),
    );
  }
  const message = payload?.choices as
    | Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>
    | undefined;
  return resultFromText(message?.[0]?.message ? openaiMessageText(message[0].message) : "");
}
