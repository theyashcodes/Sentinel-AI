import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="relative flex min-h-[360px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-24 text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[#bc13fe]/10 blur-3xl" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-white/5">
        <Icon className="h-9 w-9 text-[#00f2ff]" aria-hidden="true" />
      </div>
      <h3 className="relative mt-6 font-display text-xl font-bold text-white">{title}</h3>
      <p className="relative mt-2 max-w-sm text-sm leading-6 text-gray-500">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
