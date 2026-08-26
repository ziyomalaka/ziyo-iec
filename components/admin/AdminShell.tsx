"use client";

import { useState } from "react";
import AdminAuthGuard from "./AdminAuthGuard";
import AdminHeader from "./AdminHeader";
import AdminSidebar from "./AdminSidebar";

import { NotificationsProvider } from "@/components/dashboard/layout/NotificationsContext";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AdminAuthGuard>
      <NotificationsProvider>
        <div className="min-h-screen w-full bg-[#F7F9FC] font-sans">
          <AdminSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <div className="min-h-screen lg:ml-[247px] lg:w-[calc(100%-247px)]">
            <AdminHeader onMenuClick={() => setMobileOpen(true)} />
            <main className="px-[2%] py-[2%]">{children}</main>
          </div>
        </div>
      </NotificationsProvider>
    </AdminAuthGuard>
  );
}
