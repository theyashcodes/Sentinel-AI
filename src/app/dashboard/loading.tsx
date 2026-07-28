import { LoadingSkeleton, CardSkeleton } from "@/components/dashboard/LoadingSkeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <LoadingSkeleton className="h-8 w-48 mb-2" />
          <LoadingSkeleton className="h-4 w-96" />
        </div>
        <div className="mt-4 flex sm:ml-4 sm:mt-0">
          <LoadingSkeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 h-64"></div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 h-64"></div>
      </div>
    </div>
  );
}
