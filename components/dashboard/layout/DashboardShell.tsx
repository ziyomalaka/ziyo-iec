"use client";

import { useState } from "react";
import { usePathname } from "@/i18n/navigation";
import DashboardAuthGuard from "./DashboardAuthGuard";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import DashboardBottomNav from "./DashboardBottomNav";
import { DashboardSearchProvider } from "./DashboardSearchContext";
import { NotificationsProvider } from "./NotificationsContext";
import { LearningChromeProvider, useLearningChrome } from "@/components/dashboard/learning/LearningChromeContext";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";
import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

function DashboardShellInner({
  children,
  pathname,
  mobileOpen,
  setMobileOpen,
  isCoursesCatalog,
  isMyDirection,
}: {
  children: ReactNode;
  pathname: string;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
  isCoursesCatalog: boolean;
  isMyDirection: boolean;
}) {
  const { hideBottomNav } = useLearningChrome();
  return (
    <div className="min-h-screen w-full bg-white font-sans">
      <DashboardSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="min-h-screen min-w-0 lg:ml-[247px] lg:w-[calc(100%-247px)]">
        <DashboardHeader pathname={pathname} onMenuClick={() => setMobileOpen(true)} />
        <main
          className={cn(
            "w-full min-w-0 lg:pb-6",
            hideBottomNav ? "pb-6" : "pb-[calc(4.75rem+env(safe-area-inset-bottom))]",
            isCoursesCatalog || isMyDirection
              ? "px-0 pt-0"
              : "px-3 pt-4 sm:px-5 lg:px-6 xl:px-8 2xl:mx-auto 2xl:max-w-[1600px] 2xl:px-10"
          )}
        >
          {children}
        </main>
        {hideBottomNav ? null : <DashboardBottomNav />}
      </div>
    </div>
  );
}

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isCoursesCatalog = pathname === "/dashboard/courses";
  const isMyDirection =
    pathname === "/dashboard/my-courses" || pathname.startsWith("/dashboard/my-direction");

  useLockBodyScroll(mobileOpen);
  useEscapeKey(mobileOpen, () => setMobileOpen(false));

  return (
    <DashboardAuthGuard>
      <DashboardSearchProvider>
        <NotificationsProvider>
          <LearningChromeProvider>
            <DashboardShellInner
              pathname={pathname}
              mobileOpen={mobileOpen}
              setMobileOpen={setMobileOpen}
              isCoursesCatalog={isCoursesCatalog}
              isMyDirection={isMyDirection}
            >
              {children}
            </DashboardShellInner>
          </LearningChromeProvider>
        </NotificationsProvider>
      </DashboardSearchProvider>
    </DashboardAuthGuard>
  );
}
