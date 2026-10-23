import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { restoreUserData } from "@/lib/backup/backupEngine";
import { assertRateLimit, applyRateLimitHeaders, backupRateLimit } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await assertRateLimit(req, backupRateLimit, session.user.id);

    const body = await req.json();
    const report = await restoreUserData(session.user.id, body);

    const res = NextResponse.json(report, { status: 200 });
    return applyRateLimitHeaders(res, rl);
  } catch (error) {
    return handleApiError(error, req);
  }
}
