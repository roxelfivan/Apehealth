# Troubleshooting

> The errors you are most likely to hit, and what to do about them.

## "Add your Gemini API key in Settings first."

The active provider has no key.

1. Open **Settings**.
2. Check which provider is selected in the **AI provider** switcher.
3. Paste a key for **that** provider, or switch to the one you have a key for.
4. Press **Save**.

A Gemini key pasted while MiniMax is selected will not work — each provider has its own key field.

## "API key not valid."

The provider rejected your key.

- Make sure you pasted the whole key, with no spaces or line breaks.
- Make sure the key is for the provider you selected. A Gemini key sent to MiniMax is invalid, and vice versa.
- Check that the key has not been revoked on the provider's dashboard.
- Keys from Google AI Studio and from the Gemini API Console are the same thing — either works.

## "The request failed (404)."

Usually a model that no longer exists.

Open **Settings → Advanced API options** and pick a different model for that provider. See [Providers](providers.md) for the current list.

## "The request failed (400)."

The request was malformed. The usual cause is a hand-edited endpoint.

Open **Settings → Advanced API options** and restore the default endpoint for the provider:

- Gemini → `https://generativelanguage.googleapis.com/v1beta`
- MiniMax → `https://api.minimax.io/v1`

## "The request failed (429)."

You hit a rate limit or ran out of quota. Wait a moment and try again, or check your usage on the provider's dashboard.

## "The endpoint must be HTTPS (or localhost)."

Apehealth refuses to send your API key over plain HTTP to a remote host, because anyone on the network could read it. If you are pointing at a local server, use `http://localhost` — that is allowed.

## "Gemini blocked this photo for safety reasons."

The provider's safety filter rejected the image. Try a different photo of the meal. This is the provider's decision, not a problem with your key.

## "Gemini did not return JSON." / "MiniMax did not return JSON."

The model replied with something that was not a JSON object — usually prose, a truncated answer, or a refusal.

- Try again; it is occasionally intermittent.
- Switch to a different model — a stronger model is less likely to wander off-format.
- If you edited the endpoint by hand, restore the default.

## "Gemini returned an empty response."

The model returned no usable text. Often this is a safety block or an empty completion. Retry, or use a different model.

## "Could not read a calorie number from Gemini."

The reply was valid JSON but had no calorie value. Edit the meal's calories by hand — see [Editing meals](editing-meals.md).

## "Not enough space on this device to save the meal photo."

The browser's storage quota is full. Apehealth compresses photos before saving, but a large photo can still exceed the limit.

- Delete some older meals.
- Take the photo at a lower resolution.
- Clear site data if you want to start fresh.

## "Could not read this photo."

The file Apehealth was given could not be decoded as an image. Try a different file — JPG, PNG, HEIC, and WebP are the safe choices.

## The estimate looks wrong.

The model is estimating from a photo, and photos are ambiguous.

- **Low confidence** means the model knew it was guessing.
- Oils, dressings, and sauces are the usual culprits — they are nearly invisible but calorie-dense.
- Crop tighter to the food. A wide shot of a whole table is harder than a close-up of the plate.
- Fix it by hand. That is exactly what the calories field in the editor is for.

## The meal is on the wrong day.

A meal belongs to the day its **Logged at** timestamp falls on. Open the editor and change **Logged at**.

## My meals disappeared.

- You may be in a different browser, a different profile, or a private window — the log is per-browser.
- You may have cleared site data.
- Apehealth has no cloud backup and no sync.

## The app will not install as a PWA.

- A PWA needs HTTPS (or `localhost`).
- Some browsers only offer the install prompt after the service worker has registered.
- On iOS, use **Share → Add to Home Screen**.

## The interface language did not change

Only the language switch applies immediately — the rest of Settings is a draft until you press **Save**. The language row is the exception.

## Still stuck?

Reproduce the problem with the exact photo and settings, and check the provider's own dashboard for the failing request. Provider-side errors (rate limits, quota, safety blocks) are the most common cause of anything that looks like an app bug.

## Next steps

- [Providers](providers.md) — per-provider troubleshooting
- [Privacy and your data](privacy.md) — what is sent where