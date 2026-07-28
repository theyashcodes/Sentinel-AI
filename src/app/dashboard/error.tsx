"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
        <AlertTriangle className="h-7 w-7 text-red-500" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">Something went wrong!</h3>
      <p className="mt-2 text-sm text-zinc-400 max-w-sm">
        An unexpected error occurred while loading this page.
      </p>
      <div className="mt-6">
        <button
          onClick={() => reset()}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
