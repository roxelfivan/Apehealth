import type { AnalyzeResult, Confidence, Settings } from "./types";

const SYSTEM_PROMPT =
  "You are a food calorie estimator. Analyze the meal photo. Return ONLY a JSON object with these fields: description (string), calories (number, estimated total for the whole meal), confidence (high/medium/low). Be realistic about portion sizes. If multiple items, sum them.";

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
  const isLocal =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    throw new Error("API endpoint must be HTTPS (or localhost).");
  }
  return parsed.toString();
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
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

export async function analyzeMealPhoto(
  imageDataUrl: string,
  settings: Settings,
): Promise<AnalyzeResult> {
  const apiKey = settings.apiKey.trim();
  if (!apiKey) {
    throw new Error("Add your MiniMax API key in Settings first.");
  }

  const url = assertSafeEndpoint(settings.apiEndpoint);
  const model = settings.model.trim() || "MiniMax-M3";
  const usesFlash = /m3\.1/i.test(model);

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Estimate calories for this meal photo. Return JSON only.",
          },
          {
            type: "image_url",
            image_url: { url: imageDataUrl, detail: "low" },
          },
        ],
      },
    ],
  };

  if (usesFlash) {
    body.reasoning_effort = "low";
  } else {
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
        choices?: Array<{ message?: { content?: string } }>;
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

  const content = payload?.choices?.[0]?.message?.content;
  if (!content?.trim()) {
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
