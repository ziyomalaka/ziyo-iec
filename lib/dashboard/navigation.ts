import {
  Award,
  Bell,
  BookMarked,
  BookOpen,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  User,
  type LucideIcon,
} from "lucide-react";

import { dashboardLabels } from "./labels";

export type DashboardNavItem = {
  href: string;
  labelKey: keyof typeof dashboardLabels.menu;
  icon: LucideIcon;
  exact?: boolean;
  match?: "courseDetail";
};

export const dashboardNavItems: DashboardNavItem[] = [
  { href: "/dashboard", labelKey: "home", icon: Home, exact: true },
  { href: "/dashboard/courses", labelKey: "courses", icon: GraduationCap, exact: true },
  { href: "/dashboard/my-courses", labelKey: "myCourses", icon: BookOpen },
  { href: "/dashboard/applications", labelKey: "applications", icon: FileText },
  { href: "/dashboard/learning", labelKey: "learning", icon: BookMarked },
  { href: "/dashboard/results", labelKey: "results", icon: Award },
  { href: "/dashboard/notifications", labelKey: "notifications", icon: Bell },
  { href: "/dashboard/profile", labelKey: "profile", icon: User },
];

export const dashboardBottomNavItems: DashboardNavItem[] = [
  { href: "/dashboard", labelKey: "home", icon: Home, exact: true },
  { href: "/dashboard/my-courses", labelKey: "myCourses", icon: BookOpen },
  { href: "/dashboard/learning", labelKey: "learning", icon: BookMarked },
  { href: "/dashboard/results", labelKey: "results", icon: Award },
  { href: "/dashboard/profile", labelKey: "profile", icon: User },
];

export const dashboardDrawerExtraItems: DashboardNavItem[] = [
  { href: "/dashboard/courses", labelKey: "courses", icon: GraduationCap, exact: true },
  { href: "/dashboard/applications", labelKey: "applications", icon: FileText },
  { href: "/dashboard/portfolio", labelKey: "portfolio", icon: FolderOpen },
  { href: "/dashboard/notifications", labelKey: "notifications", icon: Bell },
];

export const dashboardPageTitles: Record<string, string> = {
  "/dashboard": "Bosh sahifa",
  "/dashboard/courses": "Malaka oshirish yo'nalishi",
  "/dashboard/my-courses": "Mening yo'nalishim",
  "/dashboard/applications": "Arizalarim",
  "/dashboard/learning": "O'quv jarayoni",
  "/dashboard/results": "Natijalarim",
  "/dashboard/portfolio": "Portfolio",
  "/dashboard/notifications": "Bildirishnomalar",
  "/dashboard/profile": "Profil",
};

export function getDashboardPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/my-direction")) {
    return "O'quv jarayoni";
  }
  if (pathname.includes("/courses/") && !pathname.endsWith("/courses")) {
    return "Kurs haqida";
  }
  if (pathname.includes("/learning/")) {
    return "O'quv jarayoni";
  }
  return dashboardPageTitles[pathname] ?? "Kabinet";
}

export function isDashboardNavActive(pathname: string, item: DashboardNavItem) {
  if (item.href === "/dashboard/my-courses") {
    return pathname === item.href || pathname.startsWith("/dashboard/my-direction");
  }
  if (item.match === "courseDetail") {
    return pathname.includes("/dashboard/courses/") && !pathname.endsWith("/courses");
  }
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
