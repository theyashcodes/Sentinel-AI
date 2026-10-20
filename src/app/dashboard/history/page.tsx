import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { LiveHistoryView } from "@/components/dashboard/LiveHistoryView";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Scan History",
  description: "Unified real-time historical audit log of all URL, QR, Voice, Media, and Email forensics.",
};

export default async function HistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in");

  let scans: any[] = [];

  try {
    scans = await db.scan.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      include: {
        result: true,
      },
    });
  } catch (error) {
    console.error("Failed to query scan history:", error);
  }

  return <LiveHistoryView initialScans={scans} />;
}
