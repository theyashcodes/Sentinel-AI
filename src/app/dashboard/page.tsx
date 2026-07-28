import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { RecentScans } from "@/components/dashboard/RecentScans";
import { ThreatSummary } from "@/components/dashboard/ThreatSummary";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { Activity, ShieldAlert, FolderGit2, Key, Search } from "lucide-react";
import Link from "next/link";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("better-auth.session_token")?.value || cookieStore.get("__Secure-better-auth.session_token")?.value;
  
  let user = null;
  if (token) {
    const sessionRecord = await db.session.findFirst({
      where: { token },
      include: { user: true }
    });
    user = sessionRecord?.user;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader 
        title={`Welcome back, ${user?.name?.split(' ')[0] || 'User'}`} 
        description="Here's an overview of your workspace and recent activity."
      >
        <Link 
          href="/dashboard/scanner/url"
          className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 transition-colors"
        >
          <Search className="h-4 w-4" />
          Quick Scan
        </Link>
      </PageHeader>

      <DashboardGrid columns={4}>
        <StatCard 
          title="Critical Threats" 
          value={0} 
          icon={ShieldAlert} 
          colorScheme="red" 
        />
        <StatCard 
          title="Total Scans" 
          value={0} 
          icon={Activity} 
          colorScheme="indigo" 
        />
        <StatCard 
          title="Active Projects" 
          value={0} 
          icon={FolderGit2} 
          colorScheme="emerald" 
        />
        <StatCard 
          title="API Requests" 
          value="0 / 1000" 
          icon={Key} 
          colorScheme="orange" 
        />
      </DashboardGrid>

      <DashboardGrid columns={3}>
        <div className="col-span-1 lg:col-span-2">
          <QuickActions />
        </div>
        <div className="col-span-1">
          <ThreatSummary />
        </div>
      </DashboardGrid>

      <DashboardGrid columns={2}>
        <RecentScans />
        <RecentActivity />
      </DashboardGrid>
    </div>
  );
}
