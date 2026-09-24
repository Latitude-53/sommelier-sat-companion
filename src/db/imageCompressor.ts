/**
 * Клиентский пайплайн компрессии фотографий.
 * Canvas-ресайз до 1200px по длинной стороне → WebP q0.75 (фолбэк JPEG).
 * Итоговый вес фото: ~80–120 КБ вместо 3–5 МБ у исходника.
 */

export interface CompressedPhoto {
  /** data:image/webp;base64,… или data:image/jpeg;base64,… */
  dataUrl: string;
  width: number;
  height: number;
  sizeKb: number;
  mime: 'image/webp' | 'image/jpeg';
}

export interface CompressOptions {
  /** Максимальная сторона, px. По умолчанию 1200. */
  maxSide?: number;
  /** Качество кодека 0..1. По умолчанию 0.75. */
  quality?: number;
}

const SUPPORTS_WEBP = (() => {
  let cached: boolean | null = null;
  return (): boolean => {
    if (cached !== null) return cached;
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    cached = canvas.toDataURL('image/webp').startsWith('data:image/webp');
    return cached;
  };
})();

/**
 * Сжимает файл изображения. Бросает Error с дружелюбным сообщением
 * (например, для неподдерживаемых форматов вроде HEIC).
 */
export async function compressPhoto(file: File, opts: CompressOptions = {}): Promise<CompressedPhoto> {
  const { maxSide = 1200, quality = 0.75 } = opts;

  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступен в этом браузере');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mime: 'image/webp' | 'image/jpeg' = SUPPORTS_WEBP() ? 'image/webp' : 'image/jpeg';
  const blob = await canvasToBlob(canvas, mime, quality);

  const dataUrl = await blobToDataUrl(blob);
  return { dataUrl, width, height, sizeKb: Math.round(blob.size / 1024), mime };
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // фолбэк ниже — например, HEIC или экзотический codec
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(img);
    }
    // Последний шанс: рисуем HTMLImageElement напрямую
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas недоступен');
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(canvas, 'image/png');
    return await createImageBitmap(blob);
  } catch {
    throw new Error(
      'Формат фото не поддерживается браузером. Сконвертируйте его в JPEG или PNG.',
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Не удалось закодировать фото'))),
      mime,
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать blob'));
    reader.readAsDataURL(blob);
  });
}
