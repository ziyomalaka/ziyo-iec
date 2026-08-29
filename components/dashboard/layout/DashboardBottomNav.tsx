"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { dashboardLabels } from "@/lib/dashboard/labels";
import { dashboardBottomNavItems, isDashboardNavActive } from "@/lib/dashboard/navigation";
import { cn } from "@/lib/cn";

const shortLabels = dashboardLabels.menuShort;

export default function DashboardBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8EDF5] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Asosiy bo'limlar"
    >
      <ul className="grid h-16 grid-cols-5">
        {dashboardBottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isDashboardNavActive(pathname, item);
          const short = shortLabels[item.labelKey as keyof typeof shortLabels];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-center",
                  active ? "text-[#0756F5]" : "text-[#64748B]"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={dashboardLabels.menu[item.labelKey]}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.2 : 1.75} />
                <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                  {short ?? dashboardLabels.menu[item.labelKey]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
