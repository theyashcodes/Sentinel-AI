import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exportUserData } from "@/lib/backup/backupEngine";
import { assertRateLimit, applyRateLimitHeaders, backupRateLimit } from "@/lib/rate-limit";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await assertRateLimit(req, backupRateLimit, session.user.id);

    const archive = await exportUserData(session.user.id);
    const fileName = `sentinel-ai-backup-${session.user.email.replace(/[^a-zA-Z0-9]/g, "_")}-${new Date().toISOString().split("T")[0]}.json`;

    const res = new NextResponse(JSON.stringify(archive, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Sentinel-Backup-Version": archive.metadata.version,
        "X-Sentinel-Checksum": archive.metadata.checksum,
      },
    });

    return applyRateLimitHeaders(res, rl);
  } catch (error) {
    return handleApiError(error, req);
  }
}
