"use client";

import { X } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import { dashboardLabels } from "@/lib/dashboard/labels";
import {
  dashboardDrawerExtraItems,
  dashboardNavItems,
  isDashboardNavActive,
} from "@/lib/dashboard/navigation";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { cn } from "@/lib/cn";

type DashboardSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function NavLinks({
  items,
  onNavigate,
}: {
  items: typeof dashboardNavItems;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isDashboardNavActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "mb-[2px] flex min-h-[46px] items-center gap-4 rounded-lg px-3 text-[14px] font-medium text-white",
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
    </>
  );
}

function SidebarChrome({
  onNavigate,
  onClose,
  mobile,
}: {
  onNavigate?: () => void;
  onClose?: () => void;
  mobile?: boolean;
}) {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-5 text-white"
      style={{
        background: "linear-gradient(180deg, #062454 0%, #031B42 50%, #021634 100%)",
      }}
    >
      <div className="flex shrink-0 items-start justify-between gap-2 pt-6 pb-3">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" onClick={onNavigate}>
          <BrandLogo size="sm" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[22px] font-bold text-white">ZiyoMalaka</p>
            <p className="text-[11px] font-normal text-white/85">{dashboardLabels.platformTagline}</p>
          </div>
        </Link>
        {mobile && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
            aria-label="Menyuni yopish"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5">
        {mobile ? (
          <>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/55">Menyu</p>
            <NavLinks items={dashboardDrawerExtraItems} onNavigate={onNavigate} />
          </>
        ) : (
          <NavLinks items={dashboardNavItems} onNavigate={onNavigate} />
        )}
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
        <SidebarChrome />
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-[#02183c]/60 lg:hidden"
            onClick={onMobileClose}
            aria-label="Menyuni yopish"
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[min(22rem,86vw)] pb-[env(safe-area-inset-bottom)] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigatsiya"
          >
            <SidebarChrome mobile onNavigate={onMobileClose} onClose={onMobileClose} />
          </aside>
        </>
      ) : null}
    </>
  );
}
