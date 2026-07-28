import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scans = await db.scan.findMany({
      where: {
        userId: session.user.id,
        type: "QR"
      },
      include: {
        result: true
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 5
    });

    return NextResponse.json({ scans });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
