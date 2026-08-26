"use client";

import { BookMarked, GraduationCap, Shield, Users } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import { getAuthUser } from "@/lib/auth/session";
import { canAccessIt, canAccessManagement, canAccessSupervisor, roleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

type AdminSidebarProps = {
  mobileOpen: boolean;
  onMobileClose: () => void;
};

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const role = getAuthUser()?.role;
  const items = [
    canAccessManagement(role) && { href: "/admin/management", label: "Boshqaruv", icon: Users },
    canAccessSupervisor(role) && { href: "/admin/supervisor", label: "Nazorat", icon: Shield },
    canAccessIt(role) && { href: "/admin/software/qualification", label: "Malaka oshirish", icon: GraduationCap },
    canAccessIt(role) && { href: "/admin/software/mandatory", label: "Majburiy blog", icon: BookMarked },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Users }[];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden px-5 text-white"
      style={{ background: "linear-gradient(180deg, #062454 0%, #031B42 50%, #021634 100%)" }}
    >
      <div className="shrink-0 pt-6 pb-3">
        <Link href={items[0]?.href ?? "/admin/management"} className="flex items-center gap-2.5" onClick={onNavigate}>
          <BrandLogo size="sm" className="h-10 w-10 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="text-[22px] font-bold text-white">ZiyoMalaka</p>
            <p className="text-[11px] font-normal text-white/85">{roleLabel(role)} paneli</p>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {items.map((item) => {
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
        })}
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
          <aside className="relative h-full w-[247px]">
            <SidebarBody onNavigate={onMobileClose} />
          </aside>
        </div>
      ) : null}
    </>
  );
}
