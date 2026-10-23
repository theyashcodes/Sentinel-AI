import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { exportUserData } from "@/lib/backup/backupEngine";
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

    let rl = null;
    try {
      rl = await assertRateLimit(req, backupRateLimit, session.user.id);
    } catch (rlErr) {
      return handleApiError(rlErr, req);
    }

    const archive = await exportUserData(session.user.id);
    const fileName = `sentinel-ai-backup-${session.user.email.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().split("T")[0]}.json`;

    const res = NextResponse.json(archive, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Sentinel-Backup-Version": archive.metadata.version,
        "X-Sentinel-Checksum": archive.metadata.checksum,
      },
    });

    if (rl) {
      applyRateLimitHeaders(res, rl);
    }
    return res;
  } catch (error) {
    return handleApiError(error, req);
  }
}
