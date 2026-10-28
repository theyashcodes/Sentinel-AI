import { NextRequest, NextResponse } from "next/server";
import { getFeedbackForScan } from "@/lib/feedback/feedbackStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scanId = searchParams.get("scanId");

    if (!scanId) {
      return NextResponse.json({ error: "scanId query parameter required" }, { status: 400 });
    }

    const feedback = await getFeedbackForScan(scanId);

    return NextResponse.json({
      hasFeedback: Boolean(feedback),
      isLocked: Boolean(feedback?.isLocked),
      feedback: feedback || null,
    });
  } catch (err) {
    console.error("[Feedback Status API Error]", err);
    return NextResponse.json(
      { error: "Internal server error fetching feedback status" },
      { status: 500 }
    );
  }
}
