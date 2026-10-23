import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { deleteCloudRestorePoint } from "@/lib/backup/backupEngine";
import { handleApiError } from "@/lib/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    await deleteCloudRestorePoint(session.user.id, id);

    return NextResponse.json({ success: true, message: "Restore point deleted." }, { status: 200 });
  } catch (error) {
    return handleApiError(error, req);
  }
}
