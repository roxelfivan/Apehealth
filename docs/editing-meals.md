# Editing meals

> Fix a number, move the timestamp, or re-estimate a meal from a fresh photo.

## Opening the editor

Every meal in the list has two buttons: a **pencil** (edit) and a **trash** (delete).

- **Today** — tap the pencil on any meal in **Today's meals**.
- **History** — tap the pencil on any meal in the grouped list.

The editor opens as a panel over the screen.

## What you can change

| Field | Editable | Notes |
| --- | --- | --- |
| **Description** | Yes | Free text. An empty value falls back to **Meal**. |
| **Calories** | Yes | Any non-negative number. Negative values are clamped to 0. |
| **Logged at** | Yes | A date and time picker. Defaults to when the meal was saved. |
| **Photo** | Yes | Retake or re-upload — see below. |
| **Protein / Carbs / Fat** | Indirectly | Replaced wholesale when you re-estimate from a photo. |
| **Food items** | Indirectly | Replaced wholesale when you re-estimate from a photo. |
| **Confidence** | Indirectly | Replaced when you re-estimate from a photo. |

## Re-estimating from a photo

This is the way to correct a bad estimate. Instead of nudging each number, give the model another look.

1. Open the editor for the meal.
2. Press **Retake photo** or **Upload photo**.
3. The new photo is sent to your active provider.
4. While it works, the spinner shows **Gemini is re-estimating calories and nutrition…**.
5. When it finishes, the description, calories, macros, food items, and confidence are all replaced with the new estimate.
6. Press **Save changes**.

The meal keeps its original **Logged at** time unless you change it yourself. That matters: re-estimating a dinner photo on the next morning should not move the meal to a different day.

### If the re-estimate fails

The original estimate is restored — the photo, calories, macros, and items all roll back to what they were — and the error appears in a banner. The meal is never left half-updated.

## Deleting a meal

Deleting is a two-step confirmation, because it is permanent:

1. Press the **trash** button on the meal.
2. The card shows **Delete** and **Keep**.
3. **Delete** removes it. **Keep** cancels.

There is no undo. Deleting a meal removes it from the log, from the daily totals, and from the chart.

## Saving

Press **Save changes** to write your edits back. The meal list, the calorie ring, and the chart all update immediately.

## Tips

- **Trust but verify the macros.** If the photo is poor — blurry, low light, half the plate out of frame — the estimate will be off. Editing calories by hand is often faster than re-taking the photo.
- **Watch the clock.** If you logged dinner late, fix **Logged at** so the meal lands on the right day. A meal logged after midnight counts for the day you set it, not the day you saved it.
- **Re-estimating costs a call.** Each re-estimate is one more request to your provider. Correct the calories by hand when you already know the number.

## Next steps

- [History](history.md) — see how your logged meals add up
- [Adding meals](adding-meals.md) — the original estimate flow