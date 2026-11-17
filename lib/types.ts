export type Confidence = "high" | "medium" | "low";

export type Meal = {
  id: string;
  imageDataUrl: string;
  description: string;
  calories: number;
  confidence: Confidence | null;
  createdAt: string;
};

export type AnalyzeResult = {
  description: string;
  calories: number;
  confidence: Confidence;
};

export type Settings = {
  dailyGoal: number;
  apiKey: string;
  apiEndpoint: string;
  model: string;
  ephemeralKey: boolean;
};
