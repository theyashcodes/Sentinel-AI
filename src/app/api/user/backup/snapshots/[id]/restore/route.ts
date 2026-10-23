import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { restoreFromCloudPoint } from "@/lib/backup/backupEngine";
import { assertRateLimit, applyRateLimitHeaders, backupRateLimit } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rl = await assertRateLimit(req, backupRateLimit, session.user.id);

    const report = await restoreFromCloudPoint(session.user.id, id);

    const res = NextResponse.json(report, { status: 200 });
    return applyRateLimitHeaders(res, rl);
  } catch (error) {
    return handleApiError(error, req);
  }
}
