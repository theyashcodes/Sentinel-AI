import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // For actions/buttons
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="sm:flex sm:items-center sm:justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="mt-4 flex sm:ml-4 sm:mt-0">
          {children}
        </div>
      )}
    </div>
  );
}
