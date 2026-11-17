# Getting started

> This page walks you through opening Apehealth for the first time and logging your first meal.

## Open the app

Use the hosted copy of Apehealth, or one you run yourself. The browser tab title is **Apehealth**.

On first visit you should see:

- The **Today** screen with a calorie ring showing `0` of your daily goal
- A banner saying **Add a Gemini API key** — you need a key before photos can be estimated
- **Today's meals** with an empty-state message and an **Add first meal** button

## Connect an AI provider

Open **Settings** — the gear icon in the header on desktop, or the gear in the bottom navigation on a phone.

Settings has an **AI provider** switcher with two choices:

| Provider | API key | Where the key comes from |
| --- | --- | --- |
| **Gemini** *(default)* | Required | [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys) |
| **MiniMax** | Required | [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |

To set up Gemini:

1. Leave **Gemini** selected.
2. Open [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys) in a new tab and create a key.
3. Paste the key into the **Gemini API key** field. Press the eye button to check what you pasted.
4. Leave **Advanced API options** alone unless you have a reason not to.
5. Press **Save**.

That is all. You do not need a MiniMax key — the switcher only matters if you want to run the same app against a second provider.

> **Both providers are independent.** Each one keeps its own key, endpoint, and model, so you can hold a Gemini key and a MiniMax key at the same time and switch between them without re-pasting anything. See [Providers](providers.md).

## Log your first meal

1. Tap **Add meal** (the round **+** in the bottom navigation, or **Add meal** in the header).
2. Take a photo with **Take photo**, or pick one with **Upload from gallery**. On a desktop you can also drag a file onto the drop zone.
3. Wait while the model works — the screen shows the photo and a spinner.
4. You land on the **review** screen with:
   - A **Description** you can rewrite
   - A **Calories** number you can correct
   - A macro row — calories, protein, carbs, fat
   - A table of the foods the model found, with calories and carbs each
   - A **Confidence** line (high / medium / low)
5. Fix anything that looks wrong, then press **Save meal**.

The meal is now on **Today**, and the calorie ring updates.

## Set your daily goal

The ring on the Today screen is measured against a daily calorie goal. The default is **2000 kcal**. To change it:

1. Open **Settings**.
2. Set **Daily calorie goal**. Anything from 500 to 8000 kcal is accepted.
3. Press **Save**.

## Choose your language

Apehealth speaks English and 繁體中文 (Traditional Chinese).

- Switch from the globe button in the header (desktop) or the globe in the bottom navigation (phone).
- Or switch it in **Settings → Language**. The change applies immediately — you do not need to save.

Your choice is remembered in this browser. On a first visit with no saved preference, Apehealth follows your browser's language.

The language also drives the **analysis**: the prompt sent to the model asks for the meal description and the food names in your chosen language, so a 繁體中文 user gets a 繁體中文 breakdown.

## Install it as an app

Apehealth is a Progressive Web App. On a phone, use your browser's **Add to Home Screen**. It launches in standalone mode with no browser chrome, and the app shell still opens offline — only the AI analysis needs the network.

## Next steps

- [Adding meals](adding-meals.md) — the photo → estimate → save flow in detail
- [Providers](providers.md) — keys, models, and switching between Gemini and MiniMax
- [Privacy and your data](privacy.md) — what stays on your device
- [What's new](whats-new.md) — the current release
