# What's new

> The current release, and what changed in it.

---

## What's new in v0.0.3

> **Gemini joins MiniMax.** Settings now has an AI provider switcher, Gemini is the default, and each provider keeps its own key. Patch on top of v0.0.2.

1. **Provider switcher** — **Settings → AI provider** toggles between **Gemini** and **MiniMax**. The key field, its label, the help note, the "get a key" link, the endpoint, and the model presets all follow the selection.
2. **Gemini is the default** — a fresh install opens on Gemini, with `gemini-3.5-flash-lite` and `https://generativelanguage.googleapis.com/v1beta` pre-filled. No key is included; paste your own from [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys).
3. **One key per provider** — Gemini and MiniMax each store their own API key, endpoint, and model. Switching back and forth never overwrites a credential.
4. **Provider-aware interface** — the "Add a Gemini API key" banner, the analysing spinner, and every error message name the provider that is actually in use.
5. **Gemini-specific handling** — inline image bytes with the MIME type, JSON-mode responses, and a distinct message when the provider's safety filter rejects a photo.

### Upgrading

Nothing to do. Existing installs keep working, and a MiniMax key you already saved is migrated into the MiniMax slot automatically. Gemini starts empty — paste a key in **Settings** when you want it.

> **Model names change.** Google retires model ids from time to time. If a saved model stops working, pick another one in **Settings → Advanced API options**.

---

## Earlier releases

### v0.0.2

Language switching no longer blocks saving a meal.

### v0.0.1

Initial release: local-first PWA food tracker. Take or upload a meal photo, let the AI estimate calories, and log it on your device. English and 繁體中文.