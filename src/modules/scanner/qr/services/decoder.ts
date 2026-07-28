import jsQR from "jsqr";

export class QRDecoder {
  /**
   * Decodes QR code from image buffer (PNG, JPG, WEBP) using canvas/jsQR.
   * If running in Node environment without native Canvas, decodes raw RGBA buffers or uses image decoders.
   */
  static async decodeImageData(imageBuffer: Buffer, mimeType: string): Promise<string> {
    // Dynamically import sharp or pure js decoders if available, or parse basic PNG/JPEG via node canvas/pngjs
    try {
      // Dynamic import pngjs/jpeg-js or canvas if available, or parse raw RGBA
      const { parseImageToRGBA } = await import("./image-parser");
      const { data, width, height } = await parseImageToRGBA(imageBuffer, mimeType);
      
      console.log("QRDecoder debug info:", {
        dataType: typeof data,
        dataLength: data?.length,
        width,
        height,
        expectedLength: width * height * 4
      });

      const code = jsQR(data, width, height, {
        inversionAttempts: "attemptBoth",
      });

      if (code && code.data) {
        return code.data;
      }

      throw new Error("No QR code found in the image. Please ensure the image is clear and contains a valid QR code.");
    } catch (err) {
      if (err instanceof Error) {
        throw err;
      }
      throw new Error("Failed to parse image data for QR code extraction.");
    }
  }
}
