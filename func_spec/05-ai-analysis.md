# AI analysis

> How Apehealth talks to a model. This is the chapter most likely to need changing — read it before touching a provider.

---

## 1. The provider registry

`lib/providers.ts` is the single source of truth. It is a leaf module: it imports nothing from `lib/`.

```ts
export const PROVIDERS = ["gemini", "minimax"] as const;
export type Provider = (typeof PROVIDERS)[number];
export const DEFAULT_PROVIDER: Provider = "gemini";
```

`PROVIDER_DEFS` holds one entry per provider:

```ts
export type ProviderDefinition = {
  label: string;        // Brand name shown in the UI (not translated)
  endpoint: string;     // Default API endpoint, without the model path
  model: string;        // Default model id
  models: string[];     // Model ids offered as suggestions in Settings
  keyUrl: string;       // Where the user creates an API key
  keyUrlLabel: string;  // Short label for the API key link
};
```

| Provider | `label` | `endpoint` | `model` | `models` | `keyUrl` |
|---|---|---|---|---|---|
| `gemini` | `Gemini` | `https://generativelanguage.googleapis.com/v1beta` | `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite`, `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-4-argon` | `https://aistudio.google.com/api-keys` |
| `minimax` | `MiniMax` | `https://api.minimax.io/v1` | `MiniMax-M3` | `MiniMax-M3`, `MiniMax-M3.1-Flash`, `MiniMax-M2.7` | `https://platform.minimax.io/user-center/basic-information/interface-key` |

**Gemini is the default.** A fresh install opens on Gemini with an empty key.

> **Model names are a moving target.** Google retires model ids regularly — `gemini-2.5-flash` and `gemini-2.0-flash` are already deprecated or shut down. When a model stops working, change the entry here and in the docs; the endpoint and the key are unaffected.

## 2. The dispatcher

`lib/analyze.ts` is the only place the app branches on provider:

```ts
export async function analyzeMealPhoto(
  imageDataUrl: string,
  settings: Settings,
): Promise<AnalyzeResult> {
  const config = settings.providers[settings.provider];
  if (settings.provider === "gemini") {
    return analyzeMealPhotoGemini(imageDataUrl, config, settings.locale);
  }
  return analyzeMealPhotoMiniMax(imageDataUrl, config, settings.locale);
}
```

Both clients share the same signature:

```ts
(imageDataUrl: string, config: ProviderConfig, locale: Locale) => Promise<AnalyzeResult>
```

**Invariant:** the rest of the app never learns which provider produced an estimate. If you add a provider, add it here and nowhere else outside `lib/providers.ts` and the Settings UI.

## 3. The prompt contract

Both clients send the **same instruction**, in the user's locale. There are exactly two variants:

| Locale | Constant |
|---|---|
| `en` | `USER_PROMPT_EN` |
| `zh-Hant` | `USER_PROMPT_ZH_HANT` |

The prompt asks for **only** a JSON object with:

| Field | Type | Meaning |
|---|---|---|
| `description` | string | A short name for the meal. In the user's language. |
| `calories` | number | Total kcal. |
| `protein` | number | Grams. |
| `carbs` | number | Grams. |
| `fat` | number | Grams. |
| `confidence` | `"high" \| "medium" \| "low"` | The model's own certainty. |
| `items` | array | `{name, calories, carbs, protein, fat}` per visible food. |

The prompt also asks the model to split visible foods into separate items **including oils, dressings, and sauces**, to be realistic about portion sizes, and to make the totals match the sum of the items.

The Chinese variant adds an explicit instruction that `description` and the `items` names **must** be written in Traditional Chinese.

**Invariant:** the two prompt variants must stay semantically identical. A change to one is a change to both. `scripts/verify-i18n.mts` asserts the English variant contains `Return ONLY a JSON object` and does **not** contain `繁體中文`, and that the Chinese variant contains `繁體中文` and the explicit `description 與 items 中的 name 必須使用繁體中文撰寫` clause.

## 4. The response contract

Every provider returns the same `AnalyzeResult`:

```ts
export type AnalyzeResult = {
  description: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  items: FoodItem[];
  confidence: Confidence;
};
```

Parsing is tolerant by design:

1. **Extract JSON.** Strip `<think>…</think>` blocks, then look for a fenced json block. If there is no fence, take the text from the first `{` to the last `}`. If either brace is missing, throw `errors.noJson`.
2. **Parse** with `JSON.parse`. A parse failure propagates as a raw `SyntaxError` — there is no recovery.
3. **Coerce numbers** through `asNonNegativeNumber`, which accepts a finite non-negative number, or a numeric string with the non-numeric characters stripped. Anything else becomes `null`.
4. **Fall back to the items.** If `calories` is missing, the total is `sumItemCalories(items)`. If `protein` / `carbs` / `fat` are missing, they are `sumItemGrams(items, key)` when at least one item carries that macro, else `null`.
5. **Require calories.** If there is still no calorie value, throw `errors.noCalories`.
6. **Round.** Calories to whole numbers; grams to one decimal place, both floored at `0`.
7. **Confidence** falls back to `"medium"` for anything unrecognised.

`parseFoodItems` accepts `name`, `item`, or `food` as the item label and discards rows with no label. `carbs` also accepts `carbohydrates`.

## 5. Gemini

### URL

```ts
export function geminiUrl(endpoint: string, model: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (trimmed.includes(":generateContent")) return trimmed;
  const cleanModel = model.trim().replace(/^models\//, "");
  return `${trimmed}/models/${cleanModel}:generateContent`;
}
```

Two cases:

- The endpoint is the API root, so append `/models/{model}:generateContent`.
- The endpoint already contains `:generateContent`, so use it verbatim. This lets a user paste a complete URL.

A leading `models/` on the model id is stripped so `models/gemini-3.5-flash-lite` and `gemini-3.5-flash-lite` produce the same URL.

### Endpoint safety

`assertSafeEndpoint` rejects anything that is not HTTPS, with one exception:

```ts
const isLocal =
  host === "localhost" ||
  host === "127.0.0.1" ||
  host === "[::1]" ||
  host === "::1";
if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
  throw new Error(translate(locale, "errors.insecureEndpoint"));
}
```

**Invariant:** the API key must never be sent over plain HTTP to a remote host. The local exception exists so a developer can point at a local proxy.

Note the endpoint is validated **before** the model path is appended, so the check sees the bare root.

### Request

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
x-goog-api-key: {apiKey}
Content-Type: application/json
```

```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        { "text": "{prompt}" },
        { "inlineData": { "mimeType": "image/jpeg", "data": "{base64}" } }
      ]
    }
  ],
  "generationConfig": { "responseMimeType": "application/json" }
}
```

The data URL is split into its MIME type and raw base64 by `splitDataUrl`, which matches `/^data:([^;,]+)?(;base64)?,([\s\S]*)$/`.

`responseMimeType: "application/json"` asks Gemini for a JSON response. It is the documented field for the REST API.

### Response

```ts
const parts = payload?.candidates?.[0]?.content?.parts ?? [];
const content = parts
  .filter((part) => part?.thought !== true)
  .map((part) => (typeof part.text === "string" ? part.text : ""))
  .join("")
  .trim();
```

Parts flagged `thought: true` are the model's reasoning and are discarded. A `promptFeedback.blockReason` of `SAFETY` produces `errors.blockedBySafety`; any other block reason produces the generic request failure.

## 6. MiniMax

### URL

```ts
function completionsUrl(endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return `${trimmed}/chat/completions`;
}
```

### Request

```
POST https://api.minimax.io/v1/chat/completions
Authorization: Bearer {apiKey}
Content-Type: application/json
```

```json
{
  "model": "MiniMax-M3",
  "max_completion_tokens": 2200,
  "messages": [
    {
      "role": "user",
      "content": [
        { "type": "text", "text": "{prompt}" },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,{base64}",
            "detail": "default",
            "max_long_side_pixel": 1280
          }
        }
      ]
    }
  ],
  "thinking": { "type": "disabled" }
}
```

The image is passed as a whole data URL in the `image_url` field — MiniMax reads that format directly.

`thinking` is disabled so the response body is the JSON answer rather than reasoning text. For a `M3.1 Flash` model (`/m3\.1/i.test(model)`) the client sends `reasoning_effort: "low"` instead, because that model family does not accept the `thinking` parameter.

### Response

The reply is read from `choices[0].message`. `messageText` handles the three shapes MiniMax can return:

1. `content` as a string.
2. `content` as an array of parts — each part's `text` is concatenated.
3. `reasoning_content` as a fallback.

On a non-OK response the message comes from `error.message`, then `base_resp.status_msg`, then the generic `errors.requestFailed`.

## 7. Error mapping

Every error surfaced to the user is a localised dictionary string. The provider name is interpolated into the message.

| Key | English | When |
|---|---|---|
| `errors.missingApiKey` | Add your {provider} API key in Settings first. | The active provider's key is empty. |
| `errors.needApiKey` | Add your {provider} API key in Settings, then try again. | The UI-level equivalent, shown as a banner. |
| `errors.couldNotReadPhoto` | Could not read this photo. | The data URL is not `data:image/`. |
| `errors.invalidEndpoint` | API endpoint is not a valid URL. | The endpoint does not parse. |
| `errors.insecureEndpoint` | API endpoint must be HTTPS (or localhost). | The endpoint is plain HTTP to a remote host. |
| `errors.noJson` | {provider} did not return JSON. | No braces could be found in the reply. |
| `errors.emptyResponse` | {provider} returned an empty response. | The reply had no usable text. |
| `errors.noCalories` | Could not read a calorie number from {provider}. | The JSON parsed but had no calorie value. |
| `errors.requestFailed` | {provider} request failed ({status}). | A non-OK HTTP status with no usable message. |
| `errors.blockedBySafety` | {provider} blocked this photo for safety reasons. Try another photo. | Gemini returned `blockReason: "SAFETY"`. |

The provider name comes from `PROVIDER_DEFS[provider].label` inside the client, so the message always names the provider that actually failed.

**Invariant:** the `{provider}` placeholder must be supplied everywhere it appears. A message rendered without it reads "Add your  API key in Settings first."

## 8. Adding a provider

1. Add the entry to `PROVIDERS` and `PROVIDER_DEFS` in `lib/providers.ts`.
2. Add a client module with the signature `(imageDataUrl, config, locale) => Promise<AnalyzeResult>`.
3. Add the branch in `lib/analyze.ts`.
4. Add the endpoint-safety check, the prompt, and the response parsing to the client.
5. Nothing else changes. The Settings UI, the storage layer, and the i18n dictionary are all provider-agnostic — except that the dictionary's provider-aware strings interpolate `PROVIDER_DEFS[provider].label`.

## 9. What leaves the device

| Provider | Payload | Credential |
|---|---|---|
| Gemini | The prompt text and the image as inline base64 with its MIME type. | `x-goog-api-key` header. |
| MiniMax | The prompt text and the image as an `image_url` data URL. | `Authorization: Bearer` header. |

Nothing else. There is no Apehealth server, no telemetry, and no analytics. See [State & persistence](04-state-and-persistence.md) for the storage side.