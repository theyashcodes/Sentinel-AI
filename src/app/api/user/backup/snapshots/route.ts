import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createCloudRestorePoint,
  listCloudRestorePoints,
} from "@/lib/backup/backupEngine";
import { assertRateLimit, applyRateLimitHeaders, backupRateLimit } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const snapshots = await listCloudRestorePoints(session.user.id);
    return NextResponse.json({ snapshots }, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await assertRateLimit(req, backupRateLimit, session.user.id);

    const body = await req.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label : undefined;
    const clientPreferences = body.clientPreferences;

    const snapshot = await createCloudRestorePoint(session.user.id, label, clientPreferences);

    const res = NextResponse.json({ success: true, snapshot }, { status: 201 });
    return applyRateLimitHeaders(res, rl);
  } catch (error) {
    return handleApiError(error, req);
  }
}
