# Settings

> The gear icon. Everything you can change lives here.

## Opening Settings

- **Desktop** — the **Settings** button in the header.
- **Phone** — the gear in the bottom navigation.

Settings is a dialog. Press **Escape**, click the backdrop, or press **Cancel** to close it without saving.

## What is in the dialog

### Language

A two-way switch between **English** and **繁體中文**.

The change applies the moment you tap it — the whole interface switches, including any analysis in progress. It is saved immediately; you do not need to press **Save**.

### Daily calorie goal

How many kcal a day you are aiming for. Must be between **500** and **8000**. The default is **2000**.

The goal drives the calorie ring on Today, the bar colours in History, and the "Daily calories vs {goal} kcal goal" caption under the chart.

### AI provider

A two-way switch between **Gemini** and **MiniMax**.

- **Gemini** is the default on a fresh install.
- Switching providers swaps the whole key / endpoint / model group below to that provider's.
- **Each provider keeps its own key, endpoint, and model.** Switching back and forth never loses a credential.

Changing the provider is a draft change like any other field — press **Save** to apply it.

### API key

A password-style field holding the key for the selected provider, with an eye button to show it.

Under the field, a note explains where the key goes and links to the provider's key page:

- **Gemini** → [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys)
- **MiniMax** → [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key)

Keys are stored only in this browser. See [Privacy and your data](privacy.md).

### Forget API key when this tab closes

A checkbox. When it is on, the key is kept in `sessionStorage` instead of `localStorage`, so it disappears when you close the tab. When it is off, the key is remembered across sessions.

The setting applies to both providers.

### Advanced API options

Collapsed by default. Expand it to override two fields for the **selected** provider:

| Field | What it does |
| --- | --- |
| **API endpoint** | The base URL requests are sent to. Must be HTTPS, or `http://localhost` for local development. |
| **Model** | The model id to use. The field offers suggestions for the selected provider, but you can type any id your provider supports. |

The defaults are:

| Provider | Endpoint | Default model |
| --- | --- | --- |
| **Gemini** | `https://generativelanguage.googleapis.com/v1beta` | `gemini-3.5-flash-lite` |
| **MiniMax** | `https://api.minimax.io/v1` | `MiniMax-M3` |

For Gemini the client appends `/models/{model}:generateContent` to the endpoint. For MiniMax it appends `/chat/completions`. You can also paste a complete URL — the client leaves it alone if it already ends in `:generateContent` or `/chat/completions`.

### Save and Cancel

- **Save** writes the goal, provider, keys, endpoints, models, and the ephemeral-key preference.
- **Cancel** closes the dialog and discards every change except the language, which was applied immediately.

## Switching providers

A typical switch:

1. Open **Settings**.
2. Tap **MiniMax** in the **AI provider** switcher. The key field label, the note, the link, and the endpoint and model all change to MiniMax.
3. Paste your MiniMax key.
4. Press **Save**.

Your Gemini key is still there. Tap **Gemini** in the switcher and it reappears.

## Next steps

- [Providers](providers.md) — how each provider is called, and which model to pick
- [Privacy and your data](privacy.md) — where the key is stored
- [Troubleshooting](troubleshooting.md) — when a key is rejected