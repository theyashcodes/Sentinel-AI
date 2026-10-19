import Image from "next/image";
import { cn } from "@/lib/utils";

type SentinelLogoProps = React.ComponentPropsWithoutRef<"div"> & {
  iconClassName?: string;
  variant?: "icon" | "full";
  size?: number;
};

export function SentinelLogo({ 
  className, 
  iconClassName, 
  variant = "icon",
  size = 40,
  ...props 
}: SentinelLogoProps) {
  if (variant === "full") {
    return (
      <div className={cn("inline-flex items-center justify-center", className)} {...props}>
        <Image
          src="/logo.png"
          alt="Sentinel AI Logo"
          width={180}
          height={60}
          className={cn("h-auto w-auto max-h-14 object-contain drop-shadow-sm", iconClassName)}
          priority
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-2xl p-1.5 bg-white/80 border border-white shadow-[0_4px_16px_rgba(59,130,246,0.12)] backdrop-blur-md overflow-hidden group",
        className
      )}
      {...props}
    >
      {/* Specular top reflection */}
      <div className="absolute inset-x-1 top-0.5 h-2 bg-gradient-to-b from-white/90 to-transparent rounded-full pointer-events-none" />
      
      <Image
        src="/logo-icon.png"
        alt="Sentinel AI"
        width={size}
        height={size}
        className={cn("object-contain transition-transform duration-300 group-hover:scale-105", iconClassName)}
        priority
      />
    </div>
  );
}
