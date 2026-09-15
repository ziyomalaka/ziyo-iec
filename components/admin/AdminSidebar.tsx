"use client";

import { useState } from "react";
import { BookMarked, ChevronDown, GraduationCap, LibraryBig, Repeat, Shield, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import { getAuthUser } from "@/lib/auth/session";
import { canAccessIt, canAccessManagement, canAccessSupervisor, roleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { RETRAINING_PANEL_LIST } from "@/lib/retraining/admin-panels";

type AdminSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = getAuthUser()?.role;
  const retrainingActive = pathname.startsWith("/admin/software/retraining");
  const [retrainingOpen, setRetrainingOpen] = useState(retrainingActive);

  const topItems = [
    canAccessManagement(role) && { href: "/admin/management", label: "Boshqaruv", icon: Users },
    canAccessSupervisor(role) && { href: "/admin/supervisor", label: "Nazorat", icon: Shield },
    canAccessIt(role) && { href: "/admin/software/qualification", label: "Malaka oshirish", icon: GraduationCap },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Users }[];

  const bottomItems = [
    canAccessIt(role) && { href: "/admin/software/mandatory", label: "Majburiy blog", icon: BookMarked },
    canAccessIt(role) && { href: "/admin/software/library", label: "Kutubxona", icon: LibraryBig },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Users }[];

  const renderLink = (item: { href: string; label: string; icon: typeof Users }) => {
    const Icon = item.icon;
    const active = pathname.startsWith(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={cn(
          "mb-[2px] flex h-[46px] items-center gap-4 rounded-lg px-3 text-[14px] font-medium text-white",
          active ? "bg-[#0756F5]" : "hover:bg-white/10"
        )}
      >
        <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={1.75} />
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-5 text-white"
      style={{ background: "linear-gradient(180deg, #062454 0%, #031B42 50%, #021634 100%)" }}
    >
      <div className="shrink-0 pt-6 pb-3">
        <Link href={topItems[0]?.href ?? "/admin/management"} className="flex items-center gap-2.5" onClick={onNavigate}>
          <BrandLogo size="sm" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[22px] font-bold text-white">ZiyoMalaka</p>
            <p className="text-[11px] font-normal text-white/85">{roleLabel(role)} paneli</p>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {topItems.map(renderLink)}

        {canAccessIt(role) ? (
          <div className="mb-[2px]">
            <button
              type="button"
              onClick={() => setRetrainingOpen((value) => !value)}
              className={cn(
                "flex h-[46px] w-full items-center gap-4 rounded-lg px-3 text-left text-[14px] font-medium text-white",
                retrainingActive ? "bg-[#0756F5]" : "hover:bg-white/10"
              )}
              aria-expanded={retrainingOpen}
            >
              <Repeat className="h-[22px] w-[22px] shrink-0" strokeWidth={1.75} />
              <span className="flex-1">Qayta tayyorlash</span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", retrainingOpen && "rotate-180")} />
            </button>
            {retrainingOpen ? (
              <div className="ml-4 mt-1 space-y-[2px] border-l border-white/15 pl-3">
                {RETRAINING_PANEL_LIST.map((panel) => {
                  const active = pathname.startsWith(panel.route);
                  return (
                    <Link
                      key={panel.slug}
                      href={panel.route}
                      onClick={onNavigate}
                      className={cn(
                        "flex min-h-[40px] items-center rounded-lg px-3 text-[13px] font-medium text-white/90",
                        active ? "bg-white/15 text-white" : "hover:bg-white/10"
                      )}
                    >
                      {panel.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}

        {bottomItems.map(renderLink)}
      </nav>
    </div>
  );
}

export default function AdminSidebar({ mobileOpen, onMobileClose }: AdminSidebarProps) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[247px] lg:block">
        <SidebarBody />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-[#0C2340]/50" onClick={onMobileClose} aria-label="Yopish" />
          <aside
            className="relative h-full w-[min(247px,85vw)] pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menyu"
          >
            <SidebarBody onNavigate={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
