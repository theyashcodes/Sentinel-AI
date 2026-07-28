import { Layers } from "lucide-react";

import { cn } from "@/lib/utils";

type SentinelLogoProps = React.ComponentPropsWithoutRef<"div"> & {
  iconClassName?: string;
};

export function SentinelLogo({ className, iconClassName, ...props }: SentinelLogoProps) {
  return (
    <div
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-950 shadow-lg",
        className
      )}
      {...props}
    >
      <Layers className={cn("h-6 w-6 text-white", iconClassName)} aria-hidden="true" />
    </div>
  );
}
