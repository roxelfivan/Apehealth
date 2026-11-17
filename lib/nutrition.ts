import type { FoodItem } from "./types";

export function asNonNegativeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^\d.]+/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function roundCalories(value: number): number {
  return Math.max(0, Math.round(value));
}

export function roundGrams(value: number): number {
  return Math.max(0, Math.round(value * 10) / 10);
}

export function formatGrams(value: number): string {
  const rounded = roundGrams(value);
  return Number.isInteger(rounded) ? `${rounded}g` : `${rounded.toFixed(1)}g`;
}

export function formatKcal(value: number, compact = false): string {
  const rounded = roundCalories(value);
  return compact ? `${rounded}kcal` : `${rounded} kcal`;
}

export function parseFoodItems(value: unknown): FoodItem[] {
  if (!Array.isArray(value)) return [];
  const items: FoodItem[] = [];
  for (const row of value) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const name =
      typeof record.name === "string"
        ? record.name.trim()
        : typeof record.item === "string"
          ? record.item.trim()
          : typeof record.food === "string"
            ? record.food.trim()
            : "";
    if (!name) continue;
    const calories = asNonNegativeNumber(record.calories) ?? 0;
    const carbs = asNonNegativeNumber(record.carbs ?? record.carbohydrates) ?? 0;
    const protein = asNonNegativeNumber(record.protein);
    const fat = asNonNegativeNumber(record.fat);
    items.push({
      name,
      calories: roundCalories(calories),
      carbs: roundGrams(carbs),
      ...(protein != null ? { protein: roundGrams(protein) } : {}),
      ...(fat != null ? { fat: roundGrams(fat) } : {}),
    });
  }
  return items;
}

export function sumItemCalories(items: FoodItem[]): number {
  return items.reduce((sum, item) => sum + item.calories, 0);
}

export function sumItemGrams(
  items: FoodItem[],
  key: "protein" | "carbs" | "fat",
): number {
  return roundGrams(items.reduce((sum, item) => sum + (item[key] ?? 0), 0));
}
