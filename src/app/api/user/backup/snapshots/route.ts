import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  createCloudRestorePoint,
  listCloudRestorePoints,
} from "@/lib/backup/backupEngine";
import { assertRateLimit, applyRateLimitHeaders, backupRateLimit } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    let session = null;
    try {
      session = await auth.api.getSession({ headers: req.headers });
    } catch {}

    if (!session?.user?.id) {
      try {
        session = await auth.api.getSession({ headers: await headers() });
      } catch {}
    }

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
    let session = null;
    try {
      session = await auth.api.getSession({ headers: req.headers });
    } catch {}

    if (!session?.user?.id) {
      try {
        session = await auth.api.getSession({ headers: await headers() });
      } catch {}
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rl = null;
    try {
      rl = await assertRateLimit(req, backupRateLimit, session.user.id);
    } catch (rlErr) {
      return handleApiError(rlErr, req);
    }

    const body = await req.json().catch(() => ({}));
    const label = typeof body.label === "string" ? body.label : undefined;
    const clientPreferences = body.clientPreferences;

    const snapshot = await createCloudRestorePoint(session.user.id, label, clientPreferences);

    const res = NextResponse.json({ success: true, snapshot }, { status: 201 });
    if (rl) {
      applyRateLimitHeaders(res, rl);
    }
    return res;
  } catch (error) {
    return handleApiError(error, req);
  }
}
