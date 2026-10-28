import { NextRequest, NextResponse } from "next/server";
import { recordFeedback } from "@/lib/feedback/feedbackStore";
import { ScanFeedbackPayload } from "@/lib/feedback/types";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
    const userId = session?.user?.id;

    const body = await req.json();
    const {
      scanId,
      tool,
      target,
      rating,
      groundTruth,
      tags,
      comment,
      originalVerdict,
      originalRiskScore,
      extractedFeatures,
    } = body;

    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json({ error: "scanId is required" }, { status: 400 });
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be an integer between 1 and 5" }, { status: 400 });
    }

    const payload: ScanFeedbackPayload = {
      scanId: scanId.trim(),
      tool: tool || "general",
      target: (target || "Unknown").trim(),
      rating: Math.round(rating),
      groundTruth: groundTruth || "UNSURE",
      tags: Array.isArray(tags) ? tags : [],
      comment: typeof comment === "string" ? comment.trim().slice(0, 500) : undefined,
      originalVerdict,
      originalRiskScore: typeof originalRiskScore === "number" ? originalRiskScore : undefined,
      extractedFeatures: typeof extractedFeatures === "object" ? extractedFeatures : undefined,
    };

    const result = await recordFeedback(payload, userId);

    if (result.alreadyLocked) {
      return NextResponse.json(
        {
          error: "Feedback for this scan is already permanently locked and cannot be changed.",
          alreadyLocked: true,
          feedback: result.feedback,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: result.feedback,
      message: "Feedback recorded and locked into active learning dataset.",
    });
  } catch (err) {
    console.error("[Feedback Submit API Error]", err);
    return NextResponse.json(
      { error: "Internal server error submitting feedback" },
      { status: 500 }
    );
  }
}
