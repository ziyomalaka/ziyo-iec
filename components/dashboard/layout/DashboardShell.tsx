"use client";

import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import DashboardAuthGuard from "./DashboardAuthGuard";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { DashboardSearchProvider } from "./DashboardSearchContext";
import { NotificationsProvider } from "./NotificationsContext";
import { cn } from "@/lib/cn";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCoursesCatalog = pathname === "/dashboard/courses";
  const isMyDirection =
    pathname === "/dashboard/my-courses" || pathname.startsWith("/dashboard/my-direction");

  return (
    <DashboardAuthGuard>
      <DashboardSearchProvider>
        <NotificationsProvider>
          <div className="min-h-screen w-full bg-white font-sans">
            <DashboardSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
            <div className="min-h-screen lg:ml-[247px] lg:w-[calc(100%-247px)]">
              <DashboardHeader pathname={pathname} onMenuClick={() => setMobileOpen(true)} />
              <main className={cn("w-full", isCoursesCatalog || isMyDirection ? "p-0" : "px-[2%] pt-[1%] pb-[2%]")}>{children}</main>
            </div>
          </div>
        </NotificationsProvider>
      </DashboardSearchProvider>
    </DashboardAuthGuard>
  );
}
