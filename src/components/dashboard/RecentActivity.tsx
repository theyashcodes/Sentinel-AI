import { Bell } from "lucide-react";

export function RecentActivity() {
  // Placeholder data
  const activities: unknown[] = [];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col h-full">
      <div className="border-b border-zinc-800 px-6 py-5">
        <h3 className="text-base font-semibold leading-6 text-white">Recent Activity</h3>
      </div>
      <div className="flex-1 px-6 py-10 flex flex-col items-center justify-center text-center">
        {activities.length === 0 ? (
          <>
            <Bell className="mx-auto h-12 w-12 text-zinc-500" />
            <h3 className="mt-2 text-sm font-semibold text-white">No recent activity</h3>
            <p className="mt-1 text-sm text-zinc-400">Actions taken in your workspace will appear here.</p>
          </>
        ) : (
          <div className="w-full">
            {/* List goes here */}
          </div>
        )}
      </div>
    </div>
  );
}
