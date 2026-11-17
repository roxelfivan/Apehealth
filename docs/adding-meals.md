# Adding meals

> How to get a photo into Apehealth, read the estimate, and save it.

## The three-step flow

```
   pick  ──────────────►  analyzing  ──────────────►  review  ──────────────►  saved
 (photo)                (model works)              (you correct it)         (Today)
```

## 1. Pick

Open **Add meal** and choose one of three ways in:

| Option | What it does |
| --- | --- |
| **Take photo** | Opens the camera. On a phone this is the rear camera; on desktop it opens the system camera app. |
| **Upload from gallery** | Opens your photo library or file picker. |
| **Drop here** | Desktop only — drag a file onto the dashed drop zone. |

Accepted formats are whatever your browser can decode; JPG, PNG, HEIC, and WebP all work.

### If you have no API key

The app checks for a key before it sends anything. If the active provider has no key, it stops, opens **Settings** for you, and shows **Add your Gemini API key in Settings, then try again**. Paste a key, press **Save**, and pick the photo again.

## 2. Analyzing

The photo is sent to the provider you selected and the model estimates the meal. The screen shows the photo and a spinner with **Gemini is estimating calories and nutrition…** (or **MiniMax**, if you selected that).

This is the only moment Apehealth talks to the network. See [Privacy and your data](privacy.md).

**How long it takes** depends on the provider and the model. A Gemini Flash model is usually a couple of seconds; a larger model with "thinking" enabled can take noticeably longer.

## 3. Review

The review screen shows everything the model returned:

| Element | What it is | Editable |
| --- | --- | --- |
| **Description** | A short name for the meal, such as "牛肉麵" | Yes — a textarea |
| **Calories** | The total kcal for the meal | Yes — a number input |
| **Confidence** | The model's own certainty: high, medium, or low | No |
| **Macro row** | Calories, protein, carbs, fat | No — from the estimate |
| **Food table** | Each food the model found, with its calories and carbs | No — from the estimate |

You can change the **description** and the **calories**. The macros and the food table are read-only here — they come straight from the estimate, and editing them is done in [the meal editor](editing-meals.md).

### What "confidence" means

- **high** — the model is sure. The photo was clear and the food was unambiguous.
- **medium** — plausible but worth checking. Common with mixed dishes or partial views.
- **low** — the model is guessing. Check the calories against your own sense of the meal.

The confidence line is a hint, not a guarantee. Models can be confidently wrong, especially about oils and dressings that are hard to see.

### Editing the numbers

- The **calories** field rejects negative values. You can type any non-negative number.
- If you leave the description empty, it falls back to **Meal**.

Press **Save meal** when you are happy with it. Press **Choose a different photo** to go back to step 1 without saving.

## What the model is told

Both providers receive the same instruction: estimate calories and nutrition for the photo and return **only** a JSON object with `description`, `calories`, `protein`, `carbs`, `fat`, `confidence`, and an `items` array of `{name, calories, carbs, protein, fat}`. The prompt also asks the model to split visible foods into separate items — including oils, dressings, and sauces — and to keep the totals consistent with the sum of the items.

The prompt is written in your selected language, so the description and the food names come back in that language too.

## Saving and storage

When you save, the app stores the meal in this browser's `localStorage`, including a **compressed copy of the photo** so you can recognise the meal later.

Photos are compressed before saving so the log fits in local storage. If a meal is too large to store, Apehealth tells you so and suggests a smaller photo rather than silently losing the meal.

## Next steps

- [Editing meals](editing-meals.md) — change a number, move the time, re-estimate
- [History](history.md) — see your calories over time
- [Troubleshooting](troubleshooting.md) — when the estimate fails