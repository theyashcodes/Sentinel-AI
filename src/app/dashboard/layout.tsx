import { ReactNode } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Dashboard | Sentinel AI",
    default: "Dashboard",
  },
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
