import { analyzeMealPhotoGemini } from "./gemini";
import { analyzeMealPhotoMiniMax } from "./minimax";
import type { AnalyzeResult, Settings } from "./types";

/**
 * Analyze a meal photo with whichever provider the user selected. Each
 * provider keeps its own API key, endpoint and model, so switching between
 * Gemini and MiniMax never loses a credential.
 */
export async function analyzeMealPhoto(
  imageDataUrl: string,
  settings: Settings,
): Promise<AnalyzeResult> {
  const config = settings.providers[settings.provider];
  if (settings.provider === "gemini") {
    return analyzeMealPhotoGemini(imageDataUrl, config, settings.locale);
  }
  return analyzeMealPhotoMiniMax(imageDataUrl, config, settings.locale);
}