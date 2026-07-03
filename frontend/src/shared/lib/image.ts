/** Максимальний розмір вихідного файлу до стиснення (5 МБ) — груба стеля проти важких файлів. */
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Тип помилки обробки аватара — щоб виклик-сайт показав відповідний i18n-меседж. */
export type ImageError = "type" | "size" | "decode";

export class ImageProcessingError extends Error {
  readonly kind: ImageError;
  constructor(kind: ImageError) {
    super(kind);
    this.name = "ImageProcessingError";
    this.kind = kind;
  }
}

/**
 * Обрізає зображення до квадрата (center-crop, «cover») і масштабує до `size`×`size`,
 * повертаючи base64 data-URL. Формат — WebP (широка підтримка 2026), fallback у якість не потрібен.
 * Уся обробка на клієнті — у БД їде вже компактний рядок (див. ADR/roadmap: avatar як data-URL).
 */
export async function fileToAvatarDataUrl(
  file: File,
  size = 256,
  quality = 0.85,
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new ImageProcessingError("type");
  if (file.size > MAX_AVATAR_BYTES) throw new ImageProcessingError("size");

  const bitmap = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageProcessingError("decode");

  // Center-crop до квадрата: беремо найменшу сторону, центруємо джерело.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  if ("close" in bitmap) bitmap.close();

  return canvas.toDataURL("image/webp", quality);
}

/** Декодує File у растр: ImageBitmap де є, інакше — через <img>+ObjectURL. */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      throw new ImageProcessingError("decode");
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new ImageProcessingError("decode"));
    };
    img.src = url;
  });
}
