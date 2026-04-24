type OptimizedImageForAI = {
  buffer: Buffer;
  contentType: string;
  optimized: boolean;
  metadata: {
    originalBytes: number;
    optimizedBytes: number;
    originalWidth: number | null;
    originalHeight: number | null;
    optimizedWidth: number | null;
    optimizedHeight: number | null;
    maxDimension: number;
    quality: number;
    skippedReason: string | null;
  };
};

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 86;
const MIN_BYTES_TO_OPTIMIZE = 1.5 * 1024 * 1024;
const MIN_SAVINGS_RATIO = 0.9;

function fallbackImage(input: {
  buffer: Buffer;
  contentType: string;
  originalWidth?: number | null;
  originalHeight?: number | null;
  reason: string;
}): OptimizedImageForAI {
  return {
    buffer: input.buffer,
    contentType: input.contentType,
    optimized: false,
    metadata: {
      originalBytes: input.buffer.length,
      optimizedBytes: input.buffer.length,
      originalWidth: input.originalWidth ?? null,
      originalHeight: input.originalHeight ?? null,
      optimizedWidth: input.originalWidth ?? null,
      optimizedHeight: input.originalHeight ?? null,
      maxDimension: MAX_DIMENSION,
      quality: JPEG_QUALITY,
      skippedReason: input.reason,
    },
  };
}

export async function optimizeImageForAI(buffer: Buffer, contentType: string): Promise<OptimizedImageForAI> {
  if (!contentType.startsWith("image/")) {
    return fallbackImage({ buffer, contentType, reason: "not-image" });
  }

  try {
    const sharp = (await import("sharp")).default;
    const image = sharp(buffer, { limitInputPixels: 40_000_000, animated: false }).rotate();
    const metadata = await image.metadata();
    const width = metadata.width ?? null;
    const height = metadata.height ?? null;
    const maxSide = Math.max(width ?? 0, height ?? 0);

    if (buffer.length < MIN_BYTES_TO_OPTIMIZE && maxSide <= 1600) {
      return fallbackImage({ buffer, contentType, originalWidth: width, originalHeight: height, reason: "small-enough" });
    }

    const optimizedBuffer = await image
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    if (optimizedBuffer.length >= buffer.length * MIN_SAVINGS_RATIO) {
      return fallbackImage({
        buffer,
        contentType,
        originalWidth: width,
        originalHeight: height,
        reason: "insufficient-savings",
      });
    }

    const optimizedMeta = await sharp(optimizedBuffer).metadata();

    return {
      buffer: optimizedBuffer,
      contentType: "image/jpeg",
      optimized: true,
      metadata: {
        originalBytes: buffer.length,
        optimizedBytes: optimizedBuffer.length,
        originalWidth: width,
        originalHeight: height,
        optimizedWidth: optimizedMeta.width ?? null,
        optimizedHeight: optimizedMeta.height ?? null,
        maxDimension: MAX_DIMENSION,
        quality: JPEG_QUALITY,
        skippedReason: null,
      },
    };
  } catch (error) {
    console.warn("[image-optimizer] falling back to original image:", error instanceof Error ? error.message : error);
    return fallbackImage({ buffer, contentType, reason: "optimizer-error" });
  }
}
