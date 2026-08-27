"use client";

import { useState } from "react";
import AdminAuthGuard from "./AdminAuthGuard";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";
import { NotificationsProvider } from "@/components/dashboard/layout/NotificationsContext";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  useLockBodyScroll(mobileOpen);
  useEscapeKey(mobileOpen, () => setMobileOpen(false));

  return (
    <AdminAuthGuard>
      <NotificationsProvider>
        <div className="min-h-screen w-full bg-[#F7F9FC] font-sans">
          <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <div className="min-h-screen min-w-0 lg:ml-[247px] lg:w-[calc(100%-247px)]">
            <AdminHeader onMenuClick={() => setMobileOpen(true)} />
            <main className="panel-gutter">{children}</main>
          </div>
        </div>
      </NotificationsProvider>
    </AdminAuthGuard>
  );
}
