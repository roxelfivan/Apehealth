# Release notes

Full changelogs for Apehealth. The current release is also summarised in [`docs/whats-new.md`](docs/whats-new.md).

---

## v0.0.3

> **Gemini joins MiniMax.** Settings now has an AI provider switcher, Gemini is the default, and each provider keeps its own key.

### Added

- **Provider switcher** in Settings — **Gemini** and **MiniMax**, with Gemini selected by default on a fresh install.
- **Gemini client** — the `generateContent` API, with the key sent as an `x-goog-api-key` header and the image sent as inline base64 with its MIME type.
- **Per-provider configuration** — each provider keeps its own API key, endpoint, and model. Switching back and forth never overwrites a credential.
- **Gemini model presets** — `gemini-3.5-flash-lite` (default), `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-4-argon`.
- **Provider-aware interface** — the API-key banner, the analysing spinner, and every error message name the provider in use.
- **`errors.blockedBySafety`** — a distinct message when the provider's safety filter rejects a photo.
- **User guide** in [`docs/`](docs) and a **Functional Specification** in [`func_spec/`](func_spec).
- **`npm run verify:storage`** — asserts the provider defaults, per-provider key persistence, and the legacy migration.

### Changed

- The default provider is now Gemini, with `gemini-3.5-flash-lite` and `https://generativelanguage.googleapis.com/v1beta` pre-filled.
- `Settings` now stores a provider config per provider instead of a single endpoint, model, and key.
- The metadata description mentions both providers.
- Bumped the service worker cache (`apehealth-v3` → `v4`) so returning users pick up the new assets.

### Migrated

- The v0.0.2 single-provider storage (`apehealth.apiKey`, `apehealth.apiEndpoint`, `apehealth.model`) is read on load and merged into the MiniMax slot. A v0.0.2 install keeps its MiniMax key and model; Gemini starts empty.

### Fixed

- Legacy endpoint and model values are now read tolerantly, so a hand-edited store still loads.

---

## v0.0.2

- Saving a meal no longer fails when the interface language is changed while the review screen is open.

---

## v0.0.1

- Initial release: a local-first PWA food tracker. Take or upload a meal photo, let the AI estimate the calories, and log it on the device. English and 繁體中文.
