"use client";

import { Link, usePathname } from "@/i18n/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import { dashboardLabels } from "@/lib/dashboard/labels";
import { dashboardNavItems, isDashboardNavActive } from "@/lib/dashboard/navigation";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { cn } from "@/lib/cn";

type DashboardSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-5 text-white"
      style={{
        background: "linear-gradient(180deg, #062454 0%, #031B42 50%, #021634 100%)",
      }}
    >
      <div className="shrink-0 pt-6 pb-3">
        <Link href="/dashboard" className="flex items-center gap-2.5" onClick={onNavigate}>
          <BrandLogo size="sm" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[22px] font-bold text-white">ZiyoMalaka</p>
            <p className="text-[11px] font-normal text-white/85">{dashboardLabels.platformTagline}</p>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {dashboardNavItems.map((item) => {
          const Icon = item.icon;
          const active = isDashboardNavActive(pathname, item);
          return (
            <Link
              key={item.labelKey}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "mb-[2px] flex h-[46px] items-center gap-4 rounded-lg px-3 text-[14px] font-medium text-white",
                active ? "bg-[#0756F5]" : "hover:bg-white/10"
              )}
            >
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 leading-snug">{dashboardLabels.menu[item.labelKey]}</span>
              {item.labelKey === "notifications" && unreadCount > 0 ? (
                <span
                  className={cn(
                    "flex h-[27px] min-w-[27px] shrink-0 items-center justify-center rounded-full px-1 text-[12px] font-semibold",
                    active ? "bg-white text-[#0756F5]" : "bg-[#0756F5] text-white"
                  )}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div
        className="pointer-events-none absolute bottom-0 left-0 z-0 h-28 w-28"
        style={{
          backgroundImage: "radial-gradient(rgba(120,170,255,0.4) 1.15px, transparent 1.2px)",
          backgroundSize: "9px 9px",
        }}
      />
    </div>
  );
}

export default function DashboardSidebar({ mobileOpen, onMobileClose }: DashboardSidebarProps) {
  return (
    <>
      <aside className="fixed top-0 left-0 z-40 hidden h-screen w-[247px] min-w-[247px] lg:block">
        <SidebarBody />
      </aside>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[#02183c]/60 lg:hidden"
            onClick={onMobileClose}
            aria-label="Menyuni yopish"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[247px] lg:hidden">
            <SidebarBody onNavigate={onMobileClose} />
          </aside>
        </>
      )}
    </>
  );
}
