const VISION_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** MiniMax caps images at 10 MB; base64 expands ~4/3, so keep raw files smaller. */
const MAX_RAW_BYTES = 3.5 * 1024 * 1024;

function normalizeMime(mime: string): string {
  const lower = mime.toLowerCase();
  if (lower === "image/jpg") return "image/jpeg";
  return lower;
}

function mimeFromMagic(bytes: Uint8Array): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function fileToCompressedDataUrl(
  file: File,
  maxSide = 1280,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read this photo.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

/** Data URL MiniMax documents for OpenAI-compatible image_url: original JPEG/PNG/GIF/WEBP bytes. */
export async function fileToApiDataUrl(file: File): Promise<string> {
  if (file.size > 0 && file.size <= MAX_RAW_BYTES) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const typed = normalizeMime(file.type || "");
    const mime = VISION_TYPES.has(typed) ? normalizeMime(typed) : mimeFromMagic(bytes);
    if (mime) {
      return `data:${mime};base64,${bytesToBase64(bytes)}`;
    }
  }
  return fileToCompressedDataUrl(file);
}
