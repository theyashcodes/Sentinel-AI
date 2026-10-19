import { NextRequest, NextResponse } from "next/server";
import { generateCyBroReply } from "@/lib/cybro/brain";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message || "";
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message.trim()) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    const response = await generateCyBroReply(message, history);
    return NextResponse.json(response);
  } catch (err) {
    console.error("[CyBro Chat API Error]", err);
    return NextResponse.json(
      { error: "CyBro temporary neural network glitch" },
      { status: 500 }
    );
  }
}
