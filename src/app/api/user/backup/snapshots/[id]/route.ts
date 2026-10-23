import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteCloudRestorePoint } from "@/lib/backup/backupEngine";
import { handleApiError } from "@/lib/errors";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
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
