# Apehealth — Functional Specification

> The developer-facing manual for this repository. It describes **what Apehealth does, how it is built, and the contracts you must respect when you change it.**

**Applies to:** `v0.0.3` · package version **0.0.3**
**Audience:** engineers new to the repo, and anyone returning to it after a few months.

---

## About this document

This is *not* the user guide. The user guide lives in [`docs/`](../docs) and is what an end user reads. This document is the engineering counterpart:

| | User guide | Functional Specification |
|---|---|---|
| Lives in | `docs/` | `func_spec/` |
| Answers | "How do I do X?" | "Where does X live and what must I not break?" |
| Audience | People using the app | People changing the app |

Both are plain markdown files in the repository. They are **not** bundled into the app — Apehealth ships no in-app docs viewer. Read them in an editor or on GitHub.

### How to read it

- **New to the repo?** Read [Product overview](01-product-overview.md), then [Architecture](02-architecture.md) end to end.
- **Adding a provider?** Start at [AI analysis](05-ai-analysis.md) — that chapter holds every provider contract.
- **Debugging a bug?** Jump to the relevant chapter, then check [Invariants and gotchas](09-maintenance-guide.md#4-invariants-and-gotchas).
- **Looking up a type or term?** [Data types & glossary](10-glossary.md).

### Conventions used here

- `lib/storage.ts` / `components/SettingsModal.tsx` — a real file, path relative to the repo root.
- `AddMeal.tsx` / `storage.ts` — a real file, named relative to its directory: a bare `*.tsx` means `components/`, a bare `*.ts` means `lib/`.
- `analyzeMealPhoto` — a real exported or module-local identifier.
- `"literal"` / `'literal'` — a string or regex that exists verbatim in the source.
- Numbers such as `2000`, `500`, `8000`, or `180_000` are the real constants, not paraphrases.
- Tables are exhaustive unless they say "notable" or "key".

### Keeping this document honest

This spec describes the code as it is. When you change behaviour:

1. Update the affected chapter(s) in `func_spec/` in the same commit.
2. If you add a module, add it to the inventory in [Architecture](02-architecture.md).
3. If you add a `localStorage` key, add it to the tables in [State & persistence](04-state-and-persistence.md).
4. If you add a provider, add it to every table in [AI analysis](05-ai-analysis.md) and to `lib/providers.ts`.
5. If you add or change a user-facing string, add it to **both** dictionaries in `lib/i18n/dictionary.ts` — the `zhHant` object is typed as `Dictionary`, so a missing key is a compile error, but a missing *translation* is not.

---

## Table of contents

### Part I — Orientation

*The shape of the product and the system.*

1. [Product overview](01-product-overview.md) — problem, users, capability list, explicit non-goals.
2. [Architecture](02-architecture.md) — layer map, module inventory, dependency rules, route tree.
3. [Runtime flows](03-runtime-flows.md) — end-to-end sequence walks, each with the files touched.

### Part II — Runtime behaviour

*What happens when the app runs.*

4. [State & persistence](04-state-and-persistence.md) — the store, every `localStorage` key, the provider config, the legacy migration.
5. [AI analysis](05-ai-analysis.md) — providers, prompts, request shapes, response parsing, error mapping.
6. [UI & internationalisation](06-ui-and-i18n.md) — screens, components, the dictionary contract, locale detection.

### Part III — Reference

*Lookup material.*

7. [Build & configuration](07-build-and-config.md) — Next.js, TypeScript, Tailwind, PWA, the version pipeline.
8. [Testing & security](08-testing-and-security.md) — the two harnesses and the threat model.
9. [Maintenance guide](09-maintenance-guide.md) — recipes, conventions, invariants, known rough edges.
10. [Data types & glossary](10-glossary.md) — every persisted interface, field by field.

---

## Quick orientation: 60 seconds

If you read nothing else:

1. **`lib/storage.ts` is the only persistence layer.** Everything on screen is a projection of `localStorage` via `lib/store.ts`. See [State & persistence](04-state-and-persistence.md).
2. **`lib/analyze.ts` is the only network layer.** One entry point, `analyzeMealPhoto`, dispatching to a per-provider client. See [AI analysis](05-ai-analysis.md).
3. **`lib/providers.ts` is the single source of truth for providers.** Adding a provider means adding an entry there, a client module, and a branch in `analyze.ts`.
4. **`lib/i18n/dictionary.ts` holds every user-facing string.** The `zhHant` object is typed as `Dictionary`, so a missing English key fails the build.
5. **The Settings modal edits a draft, not the store.** Nothing is persisted until **Save** — the language row is the single exception.

## Repository shape

```
apehealth/
├── docs/                  # User guide (task-oriented walkthroughs)
├── func_spec/             # This document (engineering reference)
├── public/
│   ├── icons/             # PWA icons (192, 512, maskable, apple-touch)
│   ├── manifest.json      # PWA manifest
│   └── sw.js              # Service worker (offline shell, same-origin only)
├── scripts/
│   ├── verify-i18n.mts    # Prompt language, provider routing, dictionary
│   └── verify-storage.mts # Provider defaults, per-provider keys, migration
├── app/
│   ├── add/page.tsx       # Route → <AddMeal />
│   ├── history/page.tsx   # Route → <HistoryScreen />
│   ├── layout.tsx         # Root layout, fonts, metadata
│   ├── page.tsx           # Route → <HomeScreen />
│   └── globals.css        # Tailwind layers + design tokens
├── components/            # React UI (14 files)
├── lib/
│   ├── analyze.ts         # Provider dispatcher (the network boundary)
│   ├── events.ts          # Store change bus
│   ├── gemini.ts          # Gemini client
│   ├── i18n/              # Locales, dictionary, translators
│   ├── image.ts           # File → data URL, compression
│   ├── minimax.ts         # MiniMax client
│   ├── nutrition.ts       # Parsing, rounding, formatting
│   ├── providers.ts       # Provider registry (source of truth)
│   ├── storage.ts         # localStorage persistence
│   ├── store.ts           # useSyncExternalStore bindings
│   ├── types.ts           # Shared TS types
│   └── version.ts         # Build-time version constant
└── next.config.ts         # Next config + APP_VERSION injection
```

## Build and verify

```bash
npm install             # install dependencies
npm run dev             # http://localhost:3000
npm run build           # type-check + production build
npm run lint            # ESLint
npm run verify:i18n     # prompt + provider routing + dictionary checks
npm run verify:storage  # provider defaults, key persistence, legacy migration
```

There is no test framework and no CI suite. The two `verify:*` scripts are hand-rolled Node harnesses that import the real source with `tsx` and assert against `node:assert/strict`. See [Testing & security](08-testing-and-security.md).
