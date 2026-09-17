"use client";

import { Bell, BookOpen, User } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { dashboardLabels } from "@/lib/dashboard/labels";
import { dashboardBottomNavItems, isDashboardNavActive, type DashboardNavItem } from "@/lib/dashboard/navigation";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { retrainingMenuLabels, retrainingMenuShort } from "@/lib/retraining/navigation";
import { isRetrainingLearningPath } from "@/lib/retraining/learning-chrome";
import { cn } from "@/lib/cn";

const shortLabels = dashboardLabels.menuShort;

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const { kind, bottomNavItems, myCourses, notifications, profile, learning } = useStudentProgramPaths();
  const learningNav: DashboardNavItem[] = [
    { href: myCourses, labelKey: "myCourses", icon: BookOpen },
    { href: notifications, labelKey: "notifications", icon: Bell },
    { href: profile, labelKey: "profile", icon: User },
  ];
  const items =
    kind === "retraining" && isRetrainingLearningPath(pathname, learning)
      ? learningNav
      : (bottomNavItems ?? dashboardBottomNavItems);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8EDF5] bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      aria-label="Asosiy bo'limlar"
    >
      <ul className={cn("grid h-16", items.length === 3 ? "grid-cols-3" : "grid-cols-5")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isDashboardNavActive(pathname, item);
          const short =
            kind === "retraining"
              ? items.length === 3
                ? retrainingMenuLabels[item.labelKey] ?? retrainingMenuShort[item.labelKey]
                : retrainingMenuShort[item.labelKey] ?? retrainingMenuLabels[item.labelKey]
              : shortLabels[item.labelKey as keyof typeof shortLabels];
          const aria =
            kind === "retraining"
              ? retrainingMenuLabels[item.labelKey] ?? dashboardLabels.menu[item.labelKey]
              : dashboardLabels.menu[item.labelKey];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-full min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-center",
                  active ? "text-[#0756F5]" : "text-[#64748B]"
                )}
                aria-current={active ? "page" : undefined}
                aria-label={aria}
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
