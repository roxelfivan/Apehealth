import type { Locale } from "./i18n/locales";

export type Confidence = "high" | "medium" | "low";

export type FoodItem = {
  name: string;
  calories: number;
  carbs: number;
  protein?: number;
  fat?: number;
};

export type Meal = {
  id: string;
  imageDataUrl: string;
  description: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  items: FoodItem[];
  confidence: Confidence | null;
  createdAt: string;
};

export type AnalyzeResult = {
  description: string;
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  items: FoodItem[];
  confidence: Confidence;
};

export type Settings = {
  dailyGoal: number;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  ephemeralKey: boolean;
  locale: Locale;
};
