# Providers

> Apehealth talks to one of two AI providers. You bring your own key for whichever you use, and you can hold both at once.

## Why bring your own key

Apehealth has no backend and no account system. There is no Apehealth API key to request, and no Apehealth server in the middle of your requests. The key you paste in **Settings** goes straight from your browser to the provider, and nowhere else.

That means:

- You pay the provider directly, at their rate.
- Your photos are sent to that provider and their retention policy applies.
- Clearing your browser storage removes the key. There is no copy anywhere else to revoke it against.

## The two providers

| | **Gemini** | **MiniMax** |
| --- | --- | --- |
| Default? | **Yes** | No |
| Get a key | [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys) | [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key) |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta` | `https://api.minimax.io/v1` |
| Path used | `/models/{model}:generateContent` | `/chat/completions` |
| Authentication | `x-goog-api-key` header | `Authorization: Bearer` header |
| Image format | Inline base64 with a MIME type | `image_url` data URL |
| Default model | `gemini-3.5-flash-lite` | `MiniMax-M3` |
| Other models offered | `gemini-4-hydrogen`, `gemini-3.8-flash`, `gemini-4-argon` | `MiniMax-M3.1-Flash`, `MiniMax-M2.7` |

Both providers are given the **same prompt** and both are asked for the same JSON shape, so the estimate lands in the same fields regardless of which one you picked.

## Picking a model

### Gemini

| Model | Use it when |
| --- | --- |
| `gemini-3.5-flash-lite` | The default. Fastest and cheapest; the right choice for everyday meal logging. |
| `gemini-4-hydrogen` | You want a stronger read on the photo and do not mind waiting. |
| `gemini-3.8-flash` | A middle ground between the two. |
| `gemini-4-argon` | Maximum accuracy on hard photos, at the highest latency and cost. |

> **A note on model names.** Google retires model ids over time. If a model you saved stops working, pick a different one in **Settings → Advanced API options**; the endpoint and the key are unaffected.

### MiniMax

| Model | Use it when |
| --- | --- |
| `MiniMax-M3` | The default. |
| `MiniMax-M3.1-Flash` | You want faster responses. |
| `MiniMax-M2.7` | The previous generation. |

You can type any model id your provider supports — the suggestion list is a convenience, not a limit.

## Using both at once

Each provider keeps its own key, endpoint, and model. A practical setup:

1. Set up Gemini and paste your Gemini key. Save.
2. Set up MiniMax and paste your MiniMax key. Save.
3. Switch the provider in **Settings** whenever you want to use the other one.

Nothing is re-entered, and neither key overwrites the other. The provider you last selected is the one used for the next photo.

## Which provider should I use?

Both are capable of estimating a meal from a photo. The practical differences:

- **Cost and speed.** The Gemini Flash tier is very cheap and fast. MiniMax pricing is competitive too.
- **Image limits.** Gemini accepts inline images up to 20 MB per request. Apehealth keeps its own uploads well under that, so it is not a practical constraint.
- **Safety filtering.** Gemini can refuse an image outright for safety reasons. Apehealth shows a specific message when that happens so you can tell it apart from a bad key.
- **Availability.** Both have had model retirements. If a provider starts failing after it worked, check the provider's model list first.

## Troubleshooting a provider

| Symptom | Likely cause |
| --- | --- |
| **API key not valid** | The key was pasted wrong, was revoked, or belongs to a different provider than the one selected. |
| **404 / model not found** | The saved model id no longer exists. Pick another in Advanced API options. |
| **The request failed (400)** | The endpoint is wrong. Reset it to the default for that provider. |
| **The request failed (429)** | You hit a rate limit or a quota. Wait, or check the provider's usage page. |
| **Blocked this photo for safety reasons** | The provider's safety filter rejected the image. Try a different photo. |
| **The endpoint must be HTTPS** | The endpoint was edited to `http://` on a non-local host. |

More in [Troubleshooting](troubleshooting.md).

## Next steps

- [Settings](settings.md) — where the provider switcher lives
- [Privacy and your data](privacy.md) — what each request contains