import { NextRequest, NextResponse } from "next/server";
import { generateCyBroReply } from "@/lib/cybro/brain";
import { assertRateLimit, cybroRateLimit } from "@/lib/rate-limit";
import { handleApiError, ValidationError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    await assertRateLimit(req, cybroRateLimit);

    const body = await req.json();
    const message = body.message || "";
    const history = Array.isArray(body.history) ? body.history : [];
    const scanContext = body.scanContext || undefined;

    if (!message.trim()) {
      throw new ValidationError("Message content cannot be empty");
    }

    const response = await generateCyBroReply(message, history, undefined, scanContext);
    return NextResponse.json(response);
  } catch (err) {
    return handleApiError(err, req);
  }
}
