export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-zinc-800/50 ${className}`} />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center gap-x-4">
        <LoadingSkeleton className="h-10 w-10 rounded-md" />
        <div className="space-y-2 flex-1">
          <LoadingSkeleton className="h-4 w-1/3" />
          <LoadingSkeleton className="h-6 w-1/4" />
        </div>
      </div>
    </div>
  );
}
