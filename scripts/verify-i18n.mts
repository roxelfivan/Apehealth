import assert from "node:assert/strict";
import { analyzeMealPhoto } from "../lib/minimax";
import { translate } from "../lib/i18n";
import type { Settings } from "../lib/types";

const captured: Array<{ body: Record<string, unknown>; url: string }> = [];

type FetchInit = { body: string };
type MessageContent = { type: string; text?: string };

// Mock fetch so we can inspect exactly what is sent to MiniMax.
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: string, init: FetchInit) => {
  const body = JSON.parse(init.body) as Record<string, unknown>;
  captured.push({ body, url });
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: "牛肉麵",
              calories: 720,
              protein: 34,
              carbs: 88,
              fat: 22,
              confidence: "high",
              items: [
                { name: "牛肉麵", calories: 520, carbs: 70, protein: 26, fat: 14 },
                { name: "滷蛋", calories: 90, carbs: 2, protein: 6, fat: 5 },
                { name: "青菜", calories: 110, carbs: 16, protein: 2, fat: 3 },
              ],
            }),
          },
        },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as typeof globalThis.fetch;

/** Read the text prompt out of the captured request body. */
function promptOf(index: number): string {
  const messages = captured[index].body.messages as Array<{
    content: MessageContent[];
  }>;
  return messages[0].content[0].text ?? "";
}

function settings(locale: "en" | "zh-Hant"): Settings {
  return {
    dailyGoal: 2000,
    apiKey: "test-key",
    apiEndpoint: "https://api.minimax.io/v1",
    model: "MiniMax-M3",
    ephemeralKey: false,
    locale,
  };
}

// --- 1. English prompt ---
const enResult = await analyzeMealPhoto(
  "data:image/jpeg;base64,AAAA",
  settings("en"),
);
const enPrompt = promptOf(0);
assert.ok(
  enPrompt.includes("Return ONLY a JSON object"),
  "English prompt should contain the English instruction",
);
assert.ok(
  !enPrompt.includes("繁體中文"),
  "English prompt should not mention Traditional Chinese",
);
assert.equal(enResult.description, "牛肉麵");
assert.equal(enResult.calories, 720);
assert.equal(enResult.confidence, "high");

// --- 2. Traditional Chinese prompt ---
const zhResult = await analyzeMealPhoto(
  "data:image/jpeg;base64,AAAA",
  settings("zh-Hant"),
);
const zhPrompt = promptOf(1);
assert.ok(
  zhPrompt.includes("繁體中文"),
  "zh-Hant prompt should explicitly request Traditional Chinese",
);
assert.ok(
  zhPrompt.includes("description 與 items 中的 name 必須使用繁體中文撰寫"),
  "zh-Hant prompt should require the description and item names in Traditional Chinese",
);
assert.ok(zhPrompt.includes("JSON"), "zh-Hant prompt should still request JSON");
assert.equal(zhResult.description, "牛肉麵");
assert.equal(zhResult.calories, 720);
assert.equal(zhResult.items.length, 3);
assert.equal(zhResult.items[0].name, "牛肉麵");

// --- 3. Errors are localized ---
await assert.rejects(
  () =>
    analyzeMealPhoto("data:image/jpeg;base64,AAAA", {
      ...settings("zh-Hant"),
      apiKey: "",
    }),
  (err: Error) => {
    assert.equal(err.message, "請先在設定中新增 MiniMax API 金鑰。");
    return true;
  },
);
await assert.rejects(
  () =>
    analyzeMealPhoto("data:image/jpeg;base64,AAAA", {
      ...settings("en"),
      apiKey: "",
    }),
  (err: Error) => {
    assert.equal(err.message, "Add your MiniMax API key in Settings first.");
    return true;
  },
);

// --- 4. Dictionary lookups ---
assert.equal(translate("zh-Hant", "home.todaysMeals"), "今日餐點");
assert.equal(translate("en", "home.todaysMeals"), "Today's meals");
assert.equal(
  translate("zh-Hant", "home.remaining", { amount: 250 }),
  "尚餘 250 大卡",
);

globalThis.fetch = realFetch;
console.log("✅ All i18n checks passed");
