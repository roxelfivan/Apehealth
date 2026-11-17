import type { Locale } from "./i18n/locales";
import type { Provider } from "./providers";

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

/** Per-provider credentials and routing. Each provider keeps its own key. */
export type ProviderConfig = {
  apiKey: string;
  apiEndpoint: string;
  model: string;
};

export type Settings = {
  dailyGoal: number;
  /** Which provider handles analysis right now. */
  provider: Provider;
  /** Config for every provider, so switching keeps each one's key and model. */
  providers: Record<Provider, ProviderConfig>;
  ephemeralKey: boolean;
  locale: Locale;
};
