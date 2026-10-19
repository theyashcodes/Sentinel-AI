import { NextRequest, NextResponse } from "next/server";
import { traceRedirectChain } from "@/lib/scanner/tracer";
import { z } from "zod";

const TracerSchema = z.object({
  url: z.string().min(1, "URL is required").max(2048),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TracerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid URL", details: parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { url } = parsed.data;
    const result = await traceRedirectChain(url);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tracer API error:", error);
    return NextResponse.json(
      { error: "Failed to trace URL redirect chain", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
