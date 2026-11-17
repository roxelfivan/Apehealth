# Build & configuration

> The toolchain, the scripts, and how the version reaches the UI.

---

## 1. Stack

| | |
|---|---|
| Framework | Next.js **16.4.6** (App Router, Turbopack) |
| UI | React **19.3.0**, React DOM **19.3.0** |
| Language | TypeScript **5.x**, `strict: true` |
| Styling | Tailwind CSS **4.3.3** via `@tailwindcss/turbopack` |
| Linting | ESLint **9** with `eslint-config-next` **16.4.6** |
| Test harnesses | `tsx` **4.20.6** + `node:assert/strict` |
| Runtime deps | None beyond Next and React |

There is **no state library, no chart library, no markdown renderer, no date library, and no UI kit**. Every dependency in `package.json` beyond the framework is a dev dependency.

## 2. Scripts

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `next dev` | Development server on `http://localhost:3000`. |
| `npm run build` | `next build` | Type-check + production build. Also runs ESLint. |
| `npm run start` | `next start` | Serves the production build. |
| `npm run lint` | `eslint` | Lints the whole repo. |
| `npm run verify:i18n` | `tsx scripts/verify-i18n.mts` | Prompt language, provider routing, request shape, dictionary output. |
| `npm run verify:storage` | `tsx scripts/verify-storage.mts` | Provider defaults, per-provider key persistence, the legacy migration. |

There is no test framework and no CI suite. The two `verify:*` scripts are hand-rolled Node harnesses that import the **real source modules** and assert against `node:assert/strict`. See [Testing & security](08-testing-and-security.md).

## 3. `next.config.ts`

```ts
const APP_VERSION = (
  JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    version: string;
  }
).version;

const nextConfig: NextConfig = {
  env: { APP_VERSION },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};
```

| Setting | Why |
|---|---|
| `env.APP_VERSION` | Injects `package.json`'s version at build time so the UI can show it without importing JSON into the client bundle. |
| `cacheComponents: true` | Enables Cache Components in Next 16. The app has no data fetching, so this mainly affects how static routes are prerendered. |
| `partialPrefetching: true` | Finer-grained prefetching for the App Router. |
| The CSS rule | Tailwind v4 is loaded through the Turbopack loader rather than PostCSS. |
| The `/sw.js` headers | `no-cache` so the service worker is never served stale; `Service-Worker-Allowed: /` so it can control the whole origin from `/sw.js`. |

## 4. The version pipeline

```
package.json "version"
  └─ next.config.ts reads it at build time
       └─ env.APP_VERSION
            └─ lib/version.ts → export const APP_VERSION = process.env.APP_VERSION ?? "0.0.0"
                 └─ components/AppShell.tsx → t("home.versionNote", { version: APP_VERSION })
```

**To ship a release, bump `package.json`'s `version`.** Nothing else needs editing — the lockfile's own `version` fields are updated by `npm install --package-lock-only`, and the header updates itself on the next build.

The fallback `"0.0.0"` only appears if `APP_VERSION` is missing, which means the build did not go through `next.config.ts`.

## 5. TypeScript

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noEmit": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  }
}
```

| Setting | Consequence |
|---|---|
| `target: "ES2017"` | **No regex `s` (dotAll) flag.** Use `[\s\S]` instead of `.` with the `s` flag. This bit `lib/gemini.ts` during development. |
| `strict: true` | No implicit `any`, no unchecked null access. |
| `paths: { "@/*": ["./*"] }` | Every import may start with `@/` — for example `import { analyzeMealPhoto } from "@/lib/analyze"`. |
| `isolatedModules: true` | Every type needs an `export type` re-export. |

## 6. Tailwind CSS v4

Tailwind v4 is configured entirely in CSS — there is no `tailwind.config.js`. The theme tokens live in `app/globals.css` as CSS custom properties.

Because the tokens are custom properties, a component writes `text-[var(--muted)]` or `bg-[var(--card)]` rather than a literal colour. The dark scheme swaps the token values under a `prefers-color-scheme: dark` media query.

Reusable component classes (`.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-icon`, `.field`) are also defined in `globals.css` with `@apply`.

## 7. Fonts

`app/layout.tsx` loads four Google fonts through `next/font`:

| Font | Variable | Role |
|---|---|---|
| DM Sans | `--font-sans-loaded` | Body text. |
| Fraunces | `--font-display-loaded` | Headings. |
| Noto Sans TC | `--font-cjk-sans-loaded` | Traditional Chinese body text. |
| Noto Serif TC | `--font-cjk-display-loaded` | Traditional Chinese headings. |

The CJK fonts are a separate variable because DM Sans and Fraunces have no CJK glyphs — a `zh-Hant` UI needs its own fallback.

All four use `display: "swap"`.

## 8. Metadata and viewport

```ts
export const metadata: Metadata = {
  applicationName: "Apehealth",
  title: "Apehealth",
  description: "Snap a meal photo. Gemini or MiniMax estimates calories. Everything stays on this device.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Apehealth" },
  icons: { icon: [...] },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe4" },
    { media: "(prefers-color-scheme: dark)", color: "#14110c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
```

`viewportFit: "cover"` is what makes `env(safe-area-inset-*)` meaningful on notched phones.

## 9. The PWA

### `public/manifest.json`

`name`, `short_name`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`, `background_color` and `theme_color` of `#14110c`, and four icons including a maskable one.

### `public/sw.js`

```js
const CACHE = "apehealth-v4";
const PRECACHE = ["/", "/add", "/history", "/manifest.json", "/icons/icon-192.png"];
```

- **Install** — precaches the shell, then `skipWaiting()`.
- **Activate** — deletes every cache that is not `CACHE`, then `clients.claim()`.
- **Fetch** — only `GET`, only same-origin. Network-first, caching the response, falling back to the cache and then to `/` on a network failure.

**Invariant:** bump `CACHE` whenever the shell changes. A stale precache serves an old build that references assets that no longer exist.

### Registration

`PwaRegister` registers `/sw.js` in a `useEffect` on mount. Registration failures are swallowed — a browser without service-worker support must not break the app.

## 10. Deployment

The app is a static site. `next build` emits three prerendered routes and their assets; any static host or CDN can serve it.

Two requirements:

1. **HTTPS** (or `localhost`) — required for the service worker, the camera capture, and the install prompt.
2. **`/sw.js` served from the origin root** with `Service-Worker-Allowed: /` — already set by `next.config.ts`.

There is no environment variable to configure, and no server-side secret. The only credential is the user's own API key, entered in the browser.
