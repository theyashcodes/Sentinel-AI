import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  colorScheme?: "indigo" | "red" | "emerald" | "orange";
}

const colorMaps = {
  indigo: "bg-indigo-500/10 text-indigo-500",
  red: "bg-red-500/10 text-red-500",
  emerald: "bg-emerald-500/10 text-emerald-500",
  orange: "bg-orange-500/10 text-orange-500",
};

export function StatCard({ title, value, icon: Icon, trend, colorScheme = "indigo" }: StatCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 transition-all hover:bg-zinc-900/80">
      <div className="flex items-center gap-x-4">
        <div className={cn("rounded-md p-2", colorMaps[colorScheme])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <span className={cn("text-xs font-medium", trend.isPositive ? "text-emerald-400" : "text-red-400")}>
                {trend.isPositive ? "+" : ""}{trend.value}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
