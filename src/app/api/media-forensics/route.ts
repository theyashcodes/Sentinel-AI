import { NextRequest, NextResponse } from "next/server";
import { analyzeMediaProvenance } from "@/lib/forensics/mediaParser";
import { analyzePixelsNative } from "@/lib/forensics/nativePixelAnalyzer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No media file provided. Please upload an image (PNG, JPEG, WebP) or video (MP4, WebM, MOV)." },
        { status: 400 }
      );
    }

    // Limit to 50MB to support short video clips
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 50MB limit. Please upload a smaller media file." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Run Metadata & Provenance Engine (C2PA, SynthID, EXIF, XMP)
    const forensicReport = await analyzeMediaProvenance(buffer, file.name);

    // 2. Run Zero-Metadata Deep Pixel & Spectral Forensics (for images)
    const isImage = file.type.startsWith("image/") || /\.(png|jpe?g|webp)$/i.test(file.name);
    if (isImage) {
      try {
        const microserviceUrl = process.env.FORENSICS_SERVICE_URL || "http://127.0.0.1:8000/detect-media";
        const serviceFormData = new FormData();
        const blob = new Blob([buffer], { type: file.type || "image/jpeg" });
        serviceFormData.append("file", blob, file.name);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

        const pixelRes = await fetch(microserviceUrl, {
          method: "POST",
          body: serviceFormData,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (pixelRes.ok) {
          const pixelData = await pixelRes.json();
          forensicReport.pixelForensics = {
            analyzed: true,
            method: pixelData.analysis_method,
            aiProbability: pixelData.ai_probability,
            isAi: pixelData.is_ai,
            verdictLabel: pixelData.verdict_label,
            elaHeatmapBase64: pixelData.ela_heatmap_base64,
            fftSpectrumBase64: pixelData.fft_spectrum_base64,
            metrics: {
              elaMeanError: pixelData.metrics?.ela_mean_error,
              elaVariance: pixelData.metrics?.ela_variance,
              spectralHighFreqPeaks: pixelData.metrics?.spectral_high_freq_peaks,
              sensorNoiseVariance: pixelData.metrics?.sensor_noise_variance,
              neuralModelConsulted: pixelData.metrics?.neural_model_consulted,
            },
            detectedArtifacts: pixelData.detected_artifacts,
            explanation: pixelData.summary_explanation,
          };

          // If metadata was stripped or inconclusive, upgrade verdict based on pixel-level forensic evidence
          if (
            forensicReport.verdict === "SCRUBBED_METADATA" ||
            forensicReport.verdict === "AUTHENTIC_MEDIA"
          ) {
            if (pixelData.is_ai) {
              forensicReport.verdict = pixelData.ai_probability >= 85 ? "CONFIRMED_AI" : "LIKELY_AI";
              forensicReport.confidenceScore = Math.max(forensicReport.confidenceScore, Math.round(pixelData.confidence));
              forensicReport.generatorTool = forensicReport.generatorTool || "Generative AI Model (Pixel Inferred)";
              forensicReport.summaryExplanation = `Zero-Metadata Pixel Forensics: ${pixelData.summary_explanation}`;
            } else if (forensicReport.verdict === "SCRUBBED_METADATA" && pixelData.verdict_label === "AUTHENTIC_MEDIA") {
              forensicReport.verdict = "AUTHENTIC_MEDIA";
              forensicReport.confidenceScore = Math.round(pixelData.confidence);
              forensicReport.summaryExplanation = pixelData.summary_explanation || "Verified authentic pixel profile. Consistent physical camera sensor noise and natural spatial frequency distribution.";
            }
          }

          // Add pixel technical evidence to the report
          if (Array.isArray(pixelData.detected_artifacts) && pixelData.detected_artifacts.length > 0) {
            for (const artifact of pixelData.detected_artifacts) {
              forensicReport.technicalEvidence.unshift({
                category: artifact.includes("Spectral") ? "SPECTRAL_FFT" : "PIXEL_ANALYSIS",
                status: pixelData.is_ai ? "CRITICAL_AI" : "WARNING",
                detail: artifact,
              });
            }
          }
        }
      } catch (serviceErr) {
        // Microservice unavailable or timed out (e.g. running on Vercel serverless)
        console.warn("[Pixel Forensics Service] Microservice unreachable, falling back to Native In-Engine Pixel Forensics:", (serviceErr as Error).message);
      }

      // Native In-Engine Zero-Metadata Pixel Forensics Fallback
      if (!forensicReport.pixelForensics) {
        const nativeResult = analyzePixelsNative(buffer, file.name);
        if (nativeResult) {
          forensicReport.pixelForensics = {
            analyzed: true,
            method: "NATIVE_VAE_RESIDUAL_CORRELATION_ENGINE",
            aiProbability: nativeResult.aiProbability,
            isAi: nativeResult.isAi,
            verdictLabel: nativeResult.verdictLabel,
            metrics: {
              sensorNoiseVariance: nativeResult.noiseVariance,
              neuralModelConsulted: false,
            },
            detectedArtifacts: nativeResult.detectedArtifacts,
            explanation: nativeResult.explanation,
          };

          if (
            forensicReport.verdict === "SCRUBBED_METADATA" ||
            forensicReport.verdict === "AUTHENTIC_MEDIA"
          ) {
            if (nativeResult.isAi) {
              forensicReport.verdict = nativeResult.verdictLabel;
              forensicReport.confidenceScore = Math.max(forensicReport.confidenceScore, Math.round(nativeResult.confidence));
              forensicReport.generatorTool = "Generative AI Model (Latent Diffusion VAE Decoder)";
              forensicReport.summaryExplanation = nativeResult.explanation;
            } else if (forensicReport.verdict === "SCRUBBED_METADATA" && nativeResult.verdictLabel === "AUTHENTIC_MEDIA") {
              forensicReport.verdict = "AUTHENTIC_MEDIA";
              forensicReport.confidenceScore = Math.round(nativeResult.confidence);
              forensicReport.summaryExplanation = nativeResult.explanation;
            }
          }

          if (nativeResult.detectedArtifacts.length > 0) {
            for (const artifact of nativeResult.detectedArtifacts) {
              forensicReport.technicalEvidence.unshift({
                category: "PIXEL_ANALYSIS",
                status: nativeResult.isAi ? "CRITICAL_AI" : "INFO",
                detail: artifact,
              });
            }
          }
        }
      }
    }

    return NextResponse.json(forensicReport);
  } catch (err) {
    console.error("[Media Forensics Error]", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to dissect media forensics",
      },
      { status: 500 }
    );
  }
}
