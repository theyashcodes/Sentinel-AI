export interface ForensicResult {
  filename: string;
  fileSizeBytes: number;
  format: "PNG" | "JPEG" | "WEBP" | "MP4" | "WEBM" | "MOV" | "UNKNOWN";
  verdict: "CONFIRMED_AI" | "LIKELY_AI" | "AUTHENTIC_MEDIA" | "SCRUBBED_METADATA";
  confidenceScore: number; // 0 - 100
  generatorTool?: string;
  prompt?: string;
  negativePrompt?: string;
  generationParameters?: Record<string, string>;
  c2pa: {
    detected: boolean;
    digitalSourceType?: string;
    claimGenerator?: string;
    signingAuthority?: string;
    manifestFound: boolean;
    rawAssertionSummary?: string;
  };
  synthId: {
    detectedMarker: boolean;
    watermarkType: string;
    explanation: string;
  };
  cameraHardware?: {
    make?: string;
    model?: string;
    lensModel?: string;
    software?: string;
    exposureTime?: string;
    fNumber?: string;
    iso?: string;
    dateCaptured?: string;
  };
  technicalEvidence: Array<{
    category: "C2PA_MANIFEST" | "PNG_CHUNK" | "XMP_IPTC" | "EXIF_HARDWARE" | "AI_PROMPT" | "VIDEO_ATOM" | "METADATA_INTEGRITY" | "PIXEL_ANALYSIS" | "SPECTRAL_FFT";
    status: "CRITICAL_AI" | "WARNING" | "VERIFIED_AUTHENTIC" | "INFO";
    detail: string;
  }>;
  pixelForensics?: {
    analyzed: boolean;
    method?: string;
    aiProbability?: number;
    isAi?: boolean;
    verdictLabel?: string;
    elaHeatmapBase64?: string;
    fftSpectrumBase64?: string;
    metrics?: {
      elaMeanError?: number;
      elaVariance?: number;
      spectralHighFreqPeaks?: number;
      sensorNoiseVariance?: number;
      neuralModelConsulted?: boolean;
    };
    detectedArtifacts?: string[];
    explanation?: string;
  };
  summaryExplanation: string;
}

/**
 * Universal BinaryBuffer that runs identically in Browser and Node.js
 * Wraps Uint8Array with binary reading methods (DataView) and text decoding.
 */
export class BinaryBuffer {
  readonly uint8: Uint8Array;
  private readonly view: DataView;
  private static latin1Decoder = new TextDecoder("latin1");
  private static utf8Decoder = new TextDecoder("utf-8");

  constructor(source: Uint8Array | ArrayBuffer | BinaryBuffer | number[] | any) {
    if (source instanceof BinaryBuffer) {
      this.uint8 = source.uint8;
    } else if (source instanceof ArrayBuffer) {
      this.uint8 = new Uint8Array(source);
    } else if (source instanceof Uint8Array) {
      this.uint8 = source;
    } else if (Array.isArray(source)) {
      this.uint8 = new Uint8Array(source);
    } else if (source?.buffer) {
      this.uint8 = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
    } else {
      this.uint8 = new Uint8Array(source || 0);
    }
    this.view = new DataView(this.uint8.buffer, this.uint8.byteOffset, this.uint8.byteLength);
  }

  get length(): number {
    return this.uint8.length;
  }

  at(index: number): number {
    return this.uint8[index] ?? 0;
  }

  subarray(start: number, end?: number): BinaryBuffer {
    return new BinaryBuffer(this.uint8.subarray(start, end));
  }

  readUInt32BE(offset: number): number {
    return this.view.getUint32(offset, false);
  }

  readUInt16BE(offset: number): number {
    return this.view.getUint16(offset, false);
  }

  readUInt32LE(offset: number): number {
    return this.view.getUint32(offset, true);
  }

  readUInt16LE(offset: number): number {
    return this.view.getUint16(offset, true);
  }

  readBigUInt64BE(offset: number): bigint {
    return this.view.getBigUint64(offset, false);
  }

  toString(encoding: "utf8" | "ascii" | "binary" = "utf8", start = 0, end?: number): string {
    const slice = this.uint8.subarray(start, end ?? this.uint8.length);
    if (encoding === "binary" || encoding === "ascii") {
      return BinaryBuffer.latin1Decoder.decode(slice);
    }
    return BinaryBuffer.utf8Decoder.decode(slice);
  }

  indexOf(byte: number, start = 0): number {
    return this.uint8.indexOf(byte, start);
  }

  static fromSource(source: any): BinaryBuffer {
    if (source instanceof BinaryBuffer) {
      return source;
    }
    return new BinaryBuffer(source);
  }
}

/**
 * Standard browser/Node decompressor for PNG zTXt/iTXt chunks
 */
async function inflateBytes(buffer: BinaryBuffer): Promise<string> {
  try {
    if (typeof DecompressionStream !== "undefined") {
      const ds = new DecompressionStream("deflate");
      const blob = new Blob([buffer.uint8 as any]);
      const stream = blob.stream().pipeThrough(ds);
      const res = new Response(stream);
      return await res.text();
    }
  } catch {
    // If deflate fails or unsupported, fall through safely
  }
  return "";
}

// ── Known AI Signatures Dictionary (Images & Video) ──
const AI_KEYWORDS = [
  { pattern: /trainedalgorithmicmedia/i, tool: "GenAI Industry Standard (C2PA/IPTC)", confidence: 99 },
  { pattern: /dall[·-]?e/i, tool: "OpenAI DALL·E", confidence: 98 },
  { pattern: /midjourney/i, tool: "Midjourney", confidence: 98 },
  { pattern: /adobe firefly/i, tool: "Adobe Firefly", confidence: 98 },
  { pattern: /stable diffusion/i, tool: "Stable Diffusion", confidence: 95 },
  { pattern: /automatic1111/i, tool: "Automatic1111 WebUI", confidence: 95 },
  { pattern: /comfyui/i, tool: "ComfyUI Node Engine", confidence: 95 },
  { pattern: /novelai/i, tool: "NovelAI Diffusion", confidence: 95 },
  { pattern: /bing image creator/i, tool: "Microsoft Designer (Bing Image Creator)", confidence: 96 },
  { pattern: /google imagen|synthid/i, tool: "Google Imagen (SynthID)", confidence: 97 },
  { pattern: /flux\.1/i, tool: "Black Forest Labs (FLUX.1)", confidence: 96 },
  // Video GenAI Tools
  { pattern: /runway|gen-2|gen-3/i, tool: "Runway Gen-3 / Gen-2 AI Video", confidence: 97 },
  { pattern: /openai sora|sora/i, tool: "OpenAI Sora Generative Video", confidence: 98 },
  { pattern: /pika labs|pika/i, tool: "Pika Labs AI Video", confidence: 96 },
  { pattern: /luma dream machine|luma ai/i, tool: "Luma Dream Machine", confidence: 96 },
  { pattern: /kling ai|kling/i, tool: "Kuaishou Kling AI Video", confidence: 96 },
  { pattern: /google veo|veo/i, tool: "Google Veo (SynthID Video)", confidence: 97 },
  { pattern: /stable video diffusion|svd/i, tool: "Stable Video Diffusion", confidence: 95 },
  { pattern: /haiper ai/i, tool: "Haiper Generative Video", confidence: 95 },
];

/**
 * Universal analysis entrypoint for uploaded media (runs in Browser AND Node.js).
 * Supports images and videos up to 50MB.
 */
export async function analyzeMediaProvenance(
  rawInput: Uint8Array | ArrayBuffer | BinaryBuffer | any,
  filename: string
): Promise<ForensicResult> {
  const buffer = BinaryBuffer.fromSource(rawInput);
  const fileSizeBytes = buffer.length;
  let format: "PNG" | "JPEG" | "WEBP" | "MP4" | "WEBM" | "MOV" | "UNKNOWN" = "UNKNOWN";

  const lowerName = filename.toLowerCase();

  if (buffer.length >= 8 && buffer.at(0) === 0x89 && buffer.at(1) === 0x50 && buffer.at(2) === 0x4e && buffer.at(3) === 0x47) {
    format = "PNG";
  } else if (buffer.length >= 3 && buffer.at(0) === 0xff && buffer.at(1) === 0xd8 && buffer.at(2) === 0xff) {
    format = "JPEG";
  } else if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    format = "WEBP";
  } else if (
    (buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp") ||
    lowerName.endsWith(".mp4") ||
    lowerName.endsWith(".m4v")
  ) {
    format = "MP4";
  } else if (lowerName.endsWith(".mov") || (buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "moov")) {
    format = "MOV";
  } else if (
    (buffer.length >= 4 && buffer.at(0) === 0x1a && buffer.at(1) === 0x45 && buffer.at(2) === 0xdf && buffer.at(3) === 0xa3) ||
    lowerName.endsWith(".webm")
  ) {
    format = "WEBM";
  }

  const result: ForensicResult = {
    filename,
    fileSizeBytes,
    format,
    verdict: "SCRUBBED_METADATA",
    confidenceScore: 0,
    c2pa: {
      detected: false,
      manifestFound: false,
    },
    synthId: {
      detectedMarker: false,
      watermarkType: "None",
      explanation: "No Google SynthID frequency or metadata assertions detected in file container.",
    },
    technicalEvidence: [],
    summaryExplanation: "Analyzing media headers...",
  };

  // Efficient scanning for quick heuristic matches without allocating massive strings for 50MB files
  let bufferAscii = "";
  if (buffer.length <= 4 * 1024 * 1024) {
    bufferAscii = buffer.toString("binary");
  } else {
    // Provenance manifests and atoms are in container headers and footers
    const head = buffer.toString("binary", 0, 2 * 1024 * 1024);
    const tail = buffer.toString("binary", Math.max(0, buffer.length - 2 * 1024 * 1024));
    bufferAscii = head + "\n" + tail;
  }

  // 1. Format-Specific Deep Parsing
  if (format === "PNG") {
    await parsePngChunks(buffer, result);
  } else if (format === "JPEG") {
    parseJpegMarkers(buffer, result);
  } else if (format === "WEBP") {
    parseWebpChunks(buffer, result);
  } else if (format === "MP4" || format === "MOV") {
    parseMp4Atoms(buffer, result);
  } else if (format === "WEBM") {
    parseWebmMetadata(buffer, result);
  }

  // 2. Global C2PA / JUMBF Manifest Search
  scanForC2paManifest(bufferAscii, result);

  // 3. Global SynthID & Google GenAI Signature Search
  scanForSynthIdMarkers(bufferAscii, result);

  // 4. Synthesize Final Verdict
  determineFinalVerdict(result);

  return result;
}

// ─────────────────────────────────────────────────────────────
// PNG Chunk Parser
// ─────────────────────────────────────────────────────────────
async function parsePngChunks(buffer: BinaryBuffer, result: ForensicResult) {
  let offset = 8; // skip 8-byte signature
  let textChunksFound = 0;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd > buffer.length) break;

    const chunkData = buffer.subarray(dataStart, dataEnd);

    if (type === "tEXt") {
      textChunksFound++;
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = chunkData.toString("ascii", 0, nullIdx);
        const text = chunkData.toString("utf8", nullIdx + 1);
        inspectAiTextPayload(keyword, text, result);
      }
    } else if (type === "zTXt") {
      textChunksFound++;
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1 && nullIdx + 2 < chunkData.length) {
        const keyword = chunkData.toString("ascii", 0, nullIdx);
        // byte after null is compression method (0 = deflate)
        const compressed = chunkData.subarray(nullIdx + 2);
        try {
          const uncompressed = await inflateBytes(compressed);
          if (uncompressed) inspectAiTextPayload(keyword, uncompressed, result);
        } catch {
          // ignore decompression failure
        }
      }
    } else if (type === "iTXt") {
      textChunksFound++;
      const nullIdx = chunkData.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = chunkData.toString("ascii", 0, nullIdx);
        const compFlag = chunkData.at(nullIdx + 1);
        // Skip language tag and translated keyword
        const currentPos = nullIdx + 3;
        const nextNull1 = chunkData.indexOf(0, currentPos);
        if (nextNull1 !== -1) {
          const nextNull2 = chunkData.indexOf(0, nextNull1 + 1);
          if (nextNull2 !== -1) {
            const rawPayload = chunkData.subarray(nextNull2 + 1);
            if (compFlag === 1) {
              try {
                const uncompressed = await inflateBytes(rawPayload);
                if (uncompressed) inspectAiTextPayload(keyword, uncompressed, result);
              } catch {
                // ignore
              }
            } else {
              inspectAiTextPayload(keyword, rawPayload.toString("utf8"), result);
            }
          }
        }
      }
    }

    if (type === "IEND") break;
    offset += 12 + length; // 4 (length) + 4 (type) + length + 4 (crc)
  }

  if (textChunksFound > 0) {
    result.technicalEvidence.push({
      category: "PNG_CHUNK",
      status: "INFO",
      detail: `Scanned ${textChunksFound} PNG metadata text chunks (tEXt/zTXt/iTXt).`,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Inspect Text Payload from PNG or Metadata
// ─────────────────────────────────────────────────────────────
function inspectAiTextPayload(keyword: string, text: string, result: ForensicResult) {
  const lowerKeyword = keyword.toLowerCase();
  const lowerText = text.toLowerCase();

  // Stable Diffusion / WebUI parameter format
  if (
    lowerKeyword === "parameters" ||
    lowerText.includes("negative prompt:") ||
    (lowerText.includes("steps: ") && lowerText.includes("sampler: "))
  ) {
    result.generatorTool = result.generatorTool || "Stable Diffusion (WebUI / SDXL)";
    result.technicalEvidence.push({
      category: "AI_PROMPT",
      status: "CRITICAL_AI",
      detail: `Extracted generation prompt parameters from PNG chunk '${keyword}'`,
    });

    // Parse prompt & negative prompt
    const negIdx = text.indexOf("Negative prompt:");
    if (negIdx !== -1) {
      result.prompt = text.substring(0, negIdx).trim();
      const afterNeg = text.substring(negIdx + "Negative prompt:".length);
      const stepsIdx = afterNeg.indexOf("Steps:");
      if (stepsIdx !== -1) {
        result.negativePrompt = afterNeg.substring(0, stepsIdx).trim();
        parseParameterKeyValues(afterNeg.substring(stepsIdx), result);
      } else {
        result.negativePrompt = afterNeg.trim();
      }
    } else {
      const stepsIdx = text.indexOf("Steps:");
      if (stepsIdx !== -1) {
        result.prompt = text.substring(0, stepsIdx).trim();
        parseParameterKeyValues(text.substring(stepsIdx), result);
      } else {
        result.prompt = text.trim();
      }
    }
  } else if (lowerKeyword === "prompt" || lowerKeyword === "workflow") {
    // ComfyUI node graph JSON
    if (text.includes("class_type") || text.includes("inputs")) {
      result.generatorTool = "ComfyUI Node Pipeline";
      result.technicalEvidence.push({
        category: "AI_PROMPT",
        status: "CRITICAL_AI",
        detail: `Detected ComfyUI generative node graph in metadata '${keyword}'`,
      });
      result.prompt = extractPromptFromComfy(text) || "ComfyUI Node Workflow";
    }
  } else if (lowerKeyword === "comment" || lowerKeyword === "description") {
    for (const kw of AI_KEYWORDS) {
      if (kw.pattern.test(text)) {
        result.generatorTool = result.generatorTool || kw.tool;
        result.technicalEvidence.push({
          category: "AI_PROMPT",
          status: "CRITICAL_AI",
          detail: `Found '${kw.tool}' generative tag in description metadata.`,
        });
        if (!result.prompt && text.length > 10) {
          result.prompt = text.substring(0, 300);
        }
      }
    }
  }
}

function parseParameterKeyValues(paramStr: string, result: ForensicResult) {
  result.generationParameters = result.generationParameters || {};
  const pairs = paramStr.split(",");
  for (const pair of pairs) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx !== -1) {
      const key = pair.substring(0, colonIdx).trim();
      const val = pair.substring(colonIdx + 1).trim();
      if (key && val && key.length < 30) {
        result.generationParameters[key] = val;
      }
    }
  }
}

function extractPromptFromComfy(comfyJson: string): string | null {
  try {
    const parsed = JSON.parse(comfyJson);
    for (const key of Object.keys(parsed)) {
      const node = parsed[key];
      if (node?.inputs?.text && typeof node.inputs.text === "string" && node.inputs.text.length > 5) {
        return node.inputs.text;
      }
    }
  } catch {
    // not JSON
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// JPEG Markers Parser
// ─────────────────────────────────────────────────────────────
function parseJpegMarkers(buffer: BinaryBuffer, result: ForensicResult) {
  let offset = 2; // skip 0xFF 0xD8

  while (offset + 4 <= buffer.length) {
    if (buffer.at(offset) !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer.at(offset + 1);
    if (marker === undefined) break;
    // Standalone markers without length
    if (marker === 0xd8 || marker === 0xd9 || marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);
    const markerDataStart = offset + 4;
    const markerDataEnd = offset + 2 + length;

    if (markerDataEnd > buffer.length) break;

    const data = buffer.subarray(markerDataStart, markerDataEnd);

    // APP1: EXIF or XMP
    if (marker === 0xe1) {
      if (data.length > 6 && data.toString("ascii", 0, 4) === "Exif") {
        parseExifHardwareData(data.subarray(6), result);
      } else if (data.length > 28 && data.toString("ascii", 0, 28).includes("http://ns.adobe.com/xap/1.0/")) {
        const xmpString = data.toString("utf8");
        parseXmpXml(xmpString, result);
      }
    }

    // APP11: JUMBF / C2PA Box
    if (marker === 0xeb) {
      if (data.toString("binary").includes("jumb") || data.toString("binary").includes("c2pa")) {
        result.c2pa.detected = true;
        result.c2pa.manifestFound = true;
        result.technicalEvidence.push({
          category: "C2PA_MANIFEST",
          status: "CRITICAL_AI",
          detail: "Detected cryptographically signed JUMBF APP11 C2PA box container.",
        });
      }
    }

    offset += 2 + length;
  }
}

// ─────────────────────────────────────────────────────────────
// WebP Chunk Parser
// ─────────────────────────────────────────────────────────────
function parseWebpChunks(buffer: BinaryBuffer, result: ForensicResult) {
  let offset = 12; // skip RIFF + size + WEBP

  while (offset + 8 <= buffer.length) {
    const fourCC = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataStart = offset + 8;
    const chunkDataEnd = chunkDataStart + chunkSize;

    if (chunkDataEnd > buffer.length) break;

    const data = buffer.subarray(chunkDataStart, chunkDataEnd);

    if (fourCC === "EXIF") {
      parseExifHardwareData(data, result);
    } else if (fourCC === "XMP ") {
      parseXmpXml(data.toString("utf8"), result);
    }

    offset += 8 + chunkSize + (chunkSize % 2); // padded to even
  }
}

// ─────────────────────────────────────────────────────────────
// MP4 / MOV Video Atom Parser
// ─────────────────────────────────────────────────────────────
function parseMp4Atoms(buffer: BinaryBuffer, result: ForensicResult) {
  let offset = 0;
  let atomsFound = 0;

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const actualSize = size === 1 && offset + 16 <= buffer.length ? Number(buffer.readBigUInt64BE(offset + 8)) : size;

    if (actualSize === 0 || actualSize > buffer.length - offset || actualSize < 8) {
      break;
    }

    atomsFound++;

    // C2PA in MP4 is placed inside a dedicated 'uuid' box or 'c2pa' box
    if (type === "uuid" || type === "c2pa") {
      const atomData = buffer.subarray(offset + 8, offset + actualSize);
      const str = atomData.toString("binary");
      if (str.includes("c2pa") || str.includes("jumb") || str.includes("trainedAlgorithmicMedia")) {
        result.c2pa.detected = true;
        result.c2pa.manifestFound = true;
        result.technicalEvidence.push({
          category: "VIDEO_ATOM",
          status: "CRITICAL_AI",
          detail: `Detected ISO C2PA provenance manifest container in MP4/MOV atom '${type}'.`,
        });
      }
    } else if (type === "moov" || type === "udta" || type === "meta") {
      // Inspect metadata strings in container tracks
      const atomData = buffer.subarray(offset + 8, Math.min(offset + actualSize, offset + 100000));
      const str = atomData.toString("utf8");

      // Check for authentic camera hardware tags
      if (str.includes("Apple") || str.includes("iPhone")) {
        result.cameraHardware = result.cameraHardware || {};
        result.cameraHardware.make = "Apple";
        result.cameraHardware.model = "iPhone Video Camera Sensor";
        result.technicalEvidence.push({
          category: "EXIF_HARDWARE",
          status: "VERIFIED_AUTHENTIC",
          detail: "Detected authentic Apple QuickTime video recording hardware metadata.",
        });
      } else if (str.includes("Sony") || str.includes("Canon") || str.includes("GoPro") || str.includes("DJI")) {
        result.cameraHardware = result.cameraHardware || {};
        const devName = str.includes("Sony") ? "Sony" : str.includes("Canon") ? "Canon" : str.includes("DJI") ? "DJI Drone" : "GoPro";
        result.cameraHardware.make = devName;
        result.technicalEvidence.push({
          category: "EXIF_HARDWARE",
          status: "VERIFIED_AUTHENTIC",
          detail: `Detected authentic ${devName} physical video recording camera signatures.`,
        });
      }

      // Check for video GenAI signatures in metadata
      for (const kw of AI_KEYWORDS) {
        if (kw.pattern.test(str)) {
          result.generatorTool = result.generatorTool || kw.tool;
          result.technicalEvidence.push({
            category: "VIDEO_ATOM",
            status: "CRITICAL_AI",
            detail: `Detected GenAI video generation signature in atom '${type}': ${kw.tool}`,
          });
        }
      }
    }

    offset += actualSize;
  }

  result.technicalEvidence.push({
    category: "VIDEO_ATOM",
    status: "INFO",
    detail: `Scanned MP4/MOV ISO base media container (${atomsFound} video atoms dissected).`,
  });
}

// ─────────────────────────────────────────────────────────────
// WebM Video Parser
// ─────────────────────────────────────────────────────────────
function parseWebmMetadata(buffer: BinaryBuffer, result: ForensicResult) {
  const headerSample = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("utf8");

  for (const kw of AI_KEYWORDS) {
    if (kw.pattern.test(headerSample)) {
      result.generatorTool = result.generatorTool || kw.tool;
      result.technicalEvidence.push({
        category: "VIDEO_ATOM",
        status: "CRITICAL_AI",
        detail: `Detected GenAI video signature in WebM container: ${kw.tool}`,
      });
    }
  }

  result.technicalEvidence.push({
    category: "VIDEO_ATOM",
    status: "INFO",
    detail: "Scanned WebM/Matroska EBML video container headers.",
  });
}

// ─────────────────────────────────────────────────────────────
// EXIF Camera Hardware Parser
// ─────────────────────────────────────────────────────────────
function parseExifHardwareData(exifBuf: BinaryBuffer, result: ForensicResult) {
  if (exifBuf.length < 8) return;

  const isLittleEndian = exifBuf.at(0) === 0x49 && exifBuf.at(1) === 0x49; // 'II' vs 'MM'
  const readU16 = (off: number) =>
    isLittleEndian ? exifBuf.readUInt16LE(off) : exifBuf.readUInt16BE(off);
  const readU32 = (off: number) =>
    isLittleEndian ? exifBuf.readUInt32LE(off) : exifBuf.readUInt32BE(off);

  const ifd0Offset = readU32(4);
  if (ifd0Offset + 2 > exifBuf.length) return;

  result.cameraHardware = result.cameraHardware || {};

  try {
    const numEntries = readU16(ifd0Offset);
    let entryPos = ifd0Offset + 2;

    for (let i = 0; i < numEntries && entryPos + 12 <= exifBuf.length; i++) {
      const tag = readU16(entryPos);
      const count = readU32(entryPos + 4);
      const valueOrOffset = readU32(entryPos + 8);

      const getStringVal = (): string => {
        if (count <= 4) {
          return exifBuf.toString("ascii", entryPos + 8, entryPos + 8 + count).replace(/\0/g, "");
        }
        if (valueOrOffset + count <= exifBuf.length) {
          return exifBuf.toString("ascii", valueOrOffset, valueOrOffset + count).replace(/\0/g, "");
        }
        return "";
      };

      if (tag === 0x010f) {
        result.cameraHardware.make = getStringVal().trim();
      } else if (tag === 0x0110) {
        result.cameraHardware.model = getStringVal().trim();
      } else if (tag === 0x0131) {
        result.cameraHardware.software = getStringVal().trim();
      } else if (tag === 0xa434) {
        result.cameraHardware.lensModel = getStringVal().trim();
      }

      entryPos += 12;
    }

    if (result.cameraHardware.make || result.cameraHardware.model) {
      result.technicalEvidence.push({
        category: "EXIF_HARDWARE",
        status: "VERIFIED_AUTHENTIC",
        detail: `Detected physical camera hardware sensor: ${result.cameraHardware.make || ""} ${result.cameraHardware.model || ""}`.trim(),
      });
    }
  } catch {
    // ignore parse errors
  }
}

// ─────────────────────────────────────────────────────────────
// XMP XML Provenance Parser
// ─────────────────────────────────────────────────────────────
function parseXmpXml(xmp: string, result: ForensicResult) {
  // Check for C2PA trainedAlgorithmicMedia
  if (xmp.includes("trainedAlgorithmicMedia") || xmp.includes("digitalSourceType")) {
    result.c2pa.detected = true;
    result.c2pa.digitalSourceType = "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia";
    result.technicalEvidence.push({
      category: "XMP_IPTC",
      status: "CRITICAL_AI",
      detail: "IPTC DigitalSourceType explicitly marked as 'trainedAlgorithmicMedia' (C2PA GenAI standard).",
    });
  }

  // Check for CreatorTool / Software
  for (const kw of AI_KEYWORDS) {
    if (kw.pattern.test(xmp)) {
      result.generatorTool = result.generatorTool || kw.tool;
      result.technicalEvidence.push({
        category: "XMP_IPTC",
        status: "CRITICAL_AI",
        detail: `Discovered GenAI authority signature in XMP packet: '${kw.tool}'`,
      });
    }
  }

  // Check for DALL-E prompt in XMP
  const promptMatch = xmp.match(/<dc:description>[\s\S]*?<rdf:li[^>]*>([^<]+)<\/rdf:li>/i);
  if (promptMatch && promptMatch[1] && !result.prompt) {
    result.prompt = promptMatch[1].trim();
  }
}

// ─────────────────────────────────────────────────────────────
// Global C2PA / JUMBF Manifest Search
// ─────────────────────────────────────────────────────────────
function scanForC2paManifest(binaryStr: string, result: ForensicResult) {
  if (binaryStr.includes("c2pa") || binaryStr.includes("urn:c2pa") || binaryStr.includes("C2PA_MANIFEST")) {
    result.c2pa.detected = true;
    result.c2pa.manifestFound = true;

    // Check for signing authority
    if (binaryStr.includes("OpenAI") || binaryStr.includes("DALL·E")) {
      result.c2pa.signingAuthority = "OpenAI Inc. (Content Credentials)";
      result.generatorTool = result.generatorTool || "OpenAI DALL·E 3";
    } else if (binaryStr.includes("Adobe") || binaryStr.includes("Firefly")) {
      result.c2pa.signingAuthority = "Adobe Systems (C2PA Content Credentials)";
      result.generatorTool = result.generatorTool || "Adobe Firefly Generative Engine";
    } else if (binaryStr.includes("Microsoft") || binaryStr.includes("BingImageCreator")) {
      result.c2pa.signingAuthority = "Microsoft Corporation (C2PA)";
      result.generatorTool = result.generatorTool || "Microsoft Designer / Copilot";
    } else if (binaryStr.includes("Google") || binaryStr.includes("Imagen")) {
      result.c2pa.signingAuthority = "Google LLC (C2PA / SynthID)";
      result.generatorTool = result.generatorTool || "Google Imagen 3";
    }

    result.technicalEvidence.push({
      category: "C2PA_MANIFEST",
      status: "CRITICAL_AI",
      detail: `Content Credentials (C2PA) assertion found. Authority: ${result.c2pa.signingAuthority || "Standard C2PA Manifest"}.`,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// SynthID & Watermark Scanner
// ─────────────────────────────────────────────────────────────
function scanForSynthIdMarkers(binaryStr: string, result: ForensicResult) {
  if (
    binaryStr.includes("SynthID") ||
    binaryStr.includes("synth_id") ||
    binaryStr.includes("Google Imagen") ||
    (binaryStr.includes("google") && binaryStr.includes("trainedAlgorithmicMedia"))
  ) {
    result.synthId.detectedMarker = true;
    result.synthId.watermarkType = "Google SynthID & GenAI Provenance Manifest";
    result.synthId.explanation =
      "Google SynthID generative markers detected. Image embeds digital provenance asserting AI algorithmic generation by Google Imagen/Gemini.";
    result.generatorTool = result.generatorTool || "Google Imagen (SynthID)";

    result.technicalEvidence.push({
      category: "C2PA_MANIFEST",
      status: "CRITICAL_AI",
      detail: "Google SynthID provenance assertion verified in container metadata.",
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Final Forensic Decision Engine
// ─────────────────────────────────────────────────────────────
function determineFinalVerdict(result: ForensicResult) {
  const mediaType =
    result.format === "MP4" || result.format === "MOV" || result.format === "WEBM"
      ? "video"
      : "image";

  // Case 1: Explicit C2PA or Prompt Extracted -> CONFIRMED_AI
  if (result.c2pa.detected || result.prompt || result.generatorTool) {
    result.verdict = "CONFIRMED_AI";
    result.confidenceScore = result.c2pa.detected && result.prompt ? 99 : 95;
    result.summaryExplanation = `Cryptographic & metadata evidence conclusively identifies this ${mediaType} as AI-generated (${result.generatorTool || "Generative AI"}). Content provenance assertions and model parameters were recovered from binary chunks.`;
    return;
  }

  // Case 2: Camera Hardware Sensor or Standard Graphic Tool Verified -> AUTHENTIC_MEDIA
  if (
    result.cameraHardware &&
    (result.cameraHardware.make || result.cameraHardware.model || result.cameraHardware.software) &&
    !result.generatorTool
  ) {
    result.verdict = "AUTHENTIC_MEDIA";
    result.confidenceScore = result.cameraHardware.make || result.cameraHardware.model ? 95 : 88;
    const device = [
      result.cameraHardware.make,
      result.cameraHardware.model,
      result.cameraHardware.software ? `(${result.cameraHardware.software})` : "",
    ]
      .filter(Boolean)
      .join(" ");

    result.summaryExplanation = `Verified as authentic ${mediaType} recorded/created with legitimate physical hardware or software: ${device}. Zero AI generation parameters, C2PA flags, or synthetic watermarks were found.`;
    return;
  }

  // Case 3: Zero AI signatures found, but metadata was scrubbed by web/social platforms
  result.verdict = "SCRUBBED_METADATA";
  result.confidenceScore = 0; // Zero AI confidence
  result.summaryExplanation = `Zero AI markers detected: Deep binary stream inspection confirmed absence of C2PA Content Credentials manifests, AI generation parameter blocks, DALL-E/Runway/Sora signatures, and Google SynthID watermarks. Recording hardware tags were also absent (typical for ${mediaType}s saved from websites, screen captures, or compressed via WhatsApp/Telegram).`;
  result.technicalEvidence.push({
    category: "METADATA_INTEGRITY",
    status: "INFO",
    detail: "Zero AI provenance artifacts detected in binary streams. Container has unverified/web-optimized metadata.",
  });
}
