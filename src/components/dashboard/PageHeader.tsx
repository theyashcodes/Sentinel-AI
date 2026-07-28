import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // For actions/buttons
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between mb-10">
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[#00f2ff]">
          Sentinel command center
        </p>
        <h1 className="font-display text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
