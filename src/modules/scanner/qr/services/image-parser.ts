import { PNG } from "pngjs";
import jpeg from "jpeg-js";

export interface ParsedRGBAImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export async function parseImageToRGBA(buffer: Buffer, mimeType: string): Promise<ParsedRGBAImage> {
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime.includes("png")) {
    try {
      const png = PNG.sync.read(buffer);
      return {
        data: new Uint8ClampedArray(png.data),
        width: png.width,
        height: png.height,
      };
    } catch {
      throw new Error("Corrupted PNG image file or invalid PNG encoding.");
    }
  }

  if (normalizedMime.includes("jpeg") || normalizedMime.includes("jpg")) {
    try {
      const rawImageData = jpeg.decode(buffer, { useTArray: true });
      return {
        data: new Uint8ClampedArray(rawImageData.data),
        width: rawImageData.width,
        height: rawImageData.height,
      };
    } catch {
      throw new Error("Corrupted JPEG image file or invalid JPEG format.");
    }
  }

  if (normalizedMime.includes("webp")) {
    throw new Error("WebP server decoding requires PNG/JPEG format or browser client-side decoder.");
  }

  // Fallback: try parsing as PNG, if fails try JPEG
  try {
    const png = PNG.sync.read(buffer);
    return {
      data: new Uint8ClampedArray(png.data),
      width: png.width,
      height: png.height,
    };
  } catch {
    try {
      const rawImageData = jpeg.decode(buffer, { useTArray: true });
      return {
        data: new Uint8ClampedArray(rawImageData.data),
        width: rawImageData.width,
        height: rawImageData.height,
      };
    } catch {
      throw new Error("Unsupported or corrupted image format. Please upload a valid JPG or PNG image.");
    }
  }
}
