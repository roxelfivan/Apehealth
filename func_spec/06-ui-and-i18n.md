# UI & internationalisation

> The screens, the component contracts, and the dictionary rules.

---

## 1. Screens

| Route | Component | Purpose |
|---|---|---|
| `/` | `HomeScreen` | Today: calorie ring, macro line, API-key banner, today's meals. |
| `/add` | `AddMeal` | Capture: pick → analyzing → review → save. |
| `/history` | `HistoryScreen` | Range selector, calorie chart, meals grouped by day. |

All three wrap their content in `AppShell`, which renders the skip link, the header, the desktop nav row, and the mobile bottom nav.

## 2. `AppShell`

```ts
type Props = {
  current: "home" | "add" | "history";
  title: string;
  subtitle?: string;
  onOpenSettings: () => void;
  children: ReactNode;
};
```

Responsive behaviour:

- **Desktop (`lg:` and up)** — a header row with the language switch, a History/Today link, an Add meal link, and a Settings button. No bottom nav.
- **Phone** — a fixed bottom nav with Today, History, a raised circular **+**, a compact language switch, and Settings. The page is padded with `env(safe-area-inset-bottom)` so the nav clears the home indicator.

The logo and the version note render only on the home screen.

## 3. `HomeScreen`

Sections, in order:

1. **Calorie ring** — an SVG ring showing calories eaten against the goal, with the remaining or over-goal amount in the middle.
2. **Macro line** — protein, carbs, and fat for today, in the language's format.
3. **API-key banner** — shown only when `hasApiKey(settings)` is false. Its title is `home.apiKeyTitle` with the provider name interpolated.
4. **Today's meals** — a flat `MealList`, or an empty state with an **Add first meal** link.

## 4. `AddMeal`

A three-state machine:

```ts
type Step = "pick" | "analyzing" | "review";
```

| State | What is rendered |
|---|---|
| `pick` | The intro line, **Take photo**, **Upload from gallery**, and the desktop drop zone. |
| `analyzing` | The photo, a spinner, and `add.analyzing` with the provider name. |
| `review` | The photo, `NutritionBreakdown`, the confidence line, the description and calories fields, and the save / choose-different buttons. |

Two hidden `<input type="file">` elements: one with `capture="environment"` for the camera, one without for the gallery. Both reset `event.target.value` after use so the same file can be picked twice.

The drop zone is `md:` and above only.

**Error handling:** any thrown error is caught, the step returns to `pick`, the image is cleared, and the message is shown in a `role="alert"` banner. If the failure was a missing key, the banner also shows an **Open settings** button.

## 5. `MealEditor`

An overlay panel, not a route. It holds local state for the description, calories, timestamp, macros, items, and confidence, initialised from the meal.

Re-estimating replaces the description, calories, macros, items, and confidence wholesale. On failure the original photo and values are restored before the error is displayed — the meal is never left half-updated.

## 6. `SettingsModal`

The dialog is rendered by all three screens. `SettingsModal` is a thin wrapper that returns `null` when `open` is false; `SettingsForm` holds the actual state.

### The remount key

```tsx
key={`${initial.dailyGoal}|${initial.provider}|${initial.ephemeralKey}|${initial.providers[initial.provider].apiKey.length}|${initial.providers[initial.provider].apiEndpoint}|${initial.providers[initial.provider].model}`}
```

The key forces a remount when the persisted settings change, so the form always starts from fresh data after a save. The locale is deliberately **excluded**, so switching the language does not discard the user's draft.

### The draft

```ts
const [draft, setDraft] = useState(initial);
```

Everything the user changes lives in `draft` until **Save**. Two helpers mutate it:

- `selectProvider(provider)` — switches the active provider and pulls that provider's config into the draft, keeping its own key, endpoint, and model.
- `updateActive(patch)` — edits the config of the currently selected provider.

On submit, the daily goal is validated against `[500, 8000]`, and every provider config is normalised: the key is trimmed, and the endpoint and model fall back to the provider defaults when blank.

### Accessibility

The dialog is a real modal:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at the title.
- Focus moves to the close button on open and returns to the previously focused element on close.
- `Escape` closes.
- `Tab` is trapped inside the form, cycling from the last focusable element to the first and back with `Shift+Tab`.
- `document.body.style.overflow` is set to `hidden` while open and restored on close.

### The provider switcher

A `role="radiogroup"` with one `role="radio"` button per provider, matching the pattern already used for the language switch. The selected button gets `aria-checked={true}`.

## 7. `MealList`

Each meal is a card with the photo, the description, the kcal and time, a compact macro line, and two icon buttons: edit and delete.

Deletion is two-step. Pressing the trash button sets `pendingDelete` to the meal id and reveals **Delete** / **Keep** inside the card. Only the second press removes the meal.

## 8. `NutritionBreakdown`

Returns `null` when there are no macros **and** no items.

- The macro row is a four-cell grid: calories, protein, carbs, fat. A missing macro renders as an em dash.
- The food table lists the name, calories, and carbs of each item, with alternating row backgrounds.

## 9. `CalorieChart`

Pure CSS bars — no chart library.

- The scale is `Math.max(goal, ...dailyCalories, 1)`.
- A bar is `bg-[var(--over)]` when the day exceeded the goal, otherwise `bg-[var(--accent)]`.
- A day with no calories still renders a 2px bar.
- When no day in the range has a meal, the chart is replaced with an empty-state message.

## 10. The i18n layer

### Locales

```ts
export const LOCALES = ["en", "zh-Hant"] as const;
export const DEFAULT_LOCALE: Locale = "en";
```

`LOCALE_TAGS` maps a locale to its BCP 47 tag (`en`, `zh-Hant`). `LOCALE_NAMES` maps it to the endonym shown in the switcher (`English`, `繁體中文`).

### The dictionary

`lib/i18n/dictionary.ts` exports `en` and `zhHant`.

```ts
export const zhHant: Dictionary = { ... };
```

`Dictionary` is `typeof en`, so the Chinese dictionary is **type-checked against the English one**. A missing key is a compile error.

**Invariant:** every user-facing string exists in both dictionaries. There is no runtime fallback for a missing *key* within a locale — `translate` falls back to English only when a path resolves to `undefined`, and then to the raw path.

### Sections

| Section | Covers |
|---|---|
| `common` | Shared labels: today, meal, kcal, per day, language. |
| `nav` | Skip link, nav items, accessible names. |
| `home` | The Today screen, including `apiKeyTitle` and `apiKeyBody`. |
| `history` | Title, subtitle, ranges, chart labels, empty states. |
| `add` | The capture flow: intro, buttons, spinner, confidence line, fields. |
| `editor` | The meal editor: eyebrow, fields, spinner, actions. |
| `list` | Meal card actions: delete, keep, edit, delete item. |
| `nutrition` | Macro labels and table headers. |
| `settings` | The settings dialog, including the provider rows. |
| `confidence` | high / medium / low. |
| `errors` | Every error message. |

### Placeholders

`translate` interpolates `{name}` placeholders:

```ts
const PLACEHOLDER = /\{(\w+)\}/g;
```

| Placeholder | Used by |
|---|---|
| `{provider}` | Every provider-aware string. The value is `PROVIDER_DEFS[provider].label`. |
| `{goal}` | `home.caloriesEatenOf`, `history.dailyVsGoal`. |
| `{amount}` | `home.overGoal`, `home.remaining`. |
| `{count}` | `home.mealCountOne`, `home.mealCountMany`. |
| `{days}` | `history.rangeDays`, `history.empty`. |
| `{status}` | `errors.requestFailed`. |
| `{version}` | `home.versionNote`. |
| `{confidence}` | `add.confidence`, `editor.resultConfidence`. |
| `{name}` | `list.editItem`, `list.deleteItem`. |
| `{link}` | `settings.apiKeyNote` — a React node, not a string. |

**Invariant:** a provider-aware string must always be rendered with `{provider}` supplied. `translate` leaves an unsubstituted placeholder in the output verbatim, which is the intended failure signal — look for `{provider}` in the UI.

### React nodes in translations

`translateNode` (exported as `tn`) supports a React node as a parameter value. `settings.apiKeyNote` uses it to embed the provider's key-page link:

```tsx
{tn("settings.apiKeyNote", {
  provider: providerLabel,
  link: (
    <a href={providerDef.keyUrl} target="_blank" rel="noreferrer">
      {providerDef.keyUrlLabel}
    </a>
  ),
})}
```

**Invariant:** never put a raw `<a>` in the dictionary. Use `tn` with a node parameter so the link stays clickable and translatable.

### `useTranslator`

```ts
const { locale, t, tn } = useTranslator();
```

`t` and `tn` are bound to the current locale with `useMemo`, so they change identity only when the locale changes. `useTranslator` reads the locale from `useSettings()`, which means a language change re-renders every component that uses it — with no reload and no context provider.

## 11. Formatting

| Function | Output |
|---|---|
| `formatDayLabel(locale, day)` | `Tue, Nov 17` — `Intl.DateTimeFormat` with `weekday: "short"`, `month: "short"`, `day: "numeric"`. |
| `formatTimeLabel(locale, iso)` | `7:05 PM` — `Intl.DateTimeFormat` with `hour: "numeric"`, `minute: "2-digit"`. |
| `formatKcal(value, compact?)` | `720 kcal` or `720kcal`. |
| `formatGrams(value)` | `30g` for a whole number, `30.5g` otherwise. |

Day labels are formatted at `T12:00:00` local time so the date cannot shift across a timezone boundary.

## 12. Theming

`app/globals.css` defines the tokens as CSS custom properties, with a dark scheme under a `prefers-color-scheme: dark` media query:

| Token | Used for |
|---|---|
| `--foreground`, `--muted` | Text. |
| `--card`, `--chip` | Surfaces. |
| `--line` | Borders and dividers. |
| `--accent`, `--accent-ink` | The primary action colour and its text colour. |
| `--over` | Over-goal calories, destructive actions. |
| `--protein`, `--carb`, `--fat` | The macro colours. |
| `--ring` | Focus rings. |

Components reference the tokens, never raw colours, so the dark scheme applies without a second stylesheet.