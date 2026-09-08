import { Award, Bell, BookMarked, BookOpen, FileText, GraduationCap, User } from "lucide-react";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import type { StudentProgramConfig } from "@/lib/dashboard/program-context";

const BASE = "/retraining";

export const retrainingNavItems: DashboardNavItem[] = [
  { href: `${BASE}/courses`, labelKey: "courses", icon: GraduationCap, exact: true },
  { href: `${BASE}/applications`, labelKey: "applications", icon: FileText },
  { href: `${BASE}/my-courses`, labelKey: "myCourses", icon: BookOpen },
  { href: `${BASE}/learning`, labelKey: "learning", icon: BookMarked },
  { href: `${BASE}/results`, labelKey: "results", icon: Award },
  { href: `${BASE}/notifications`, labelKey: "notifications", icon: Bell },
  { href: `${BASE}/profile`, labelKey: "profile", icon: User },
];

export const retrainingBottomNavItems: DashboardNavItem[] = [
  { href: `${BASE}/courses`, labelKey: "courses", icon: GraduationCap },
  { href: `${BASE}/my-courses`, labelKey: "myCourses", icon: BookOpen },
  { href: `${BASE}/learning`, labelKey: "learning", icon: BookMarked },
  { href: `${BASE}/results`, labelKey: "results", icon: Award },
  { href: `${BASE}/notifications`, labelKey: "notifications", icon: Bell },
];

const titles: Record<string, string> = {
  [BASE]: "Qayta tayyorlash",
  [`${BASE}/courses`]: "Kurslar",
  [`${BASE}/applications`]: "Ariza",
  [`${BASE}/my-courses`]: "Mening kurslarim",
  [`${BASE}/learning`]: "O'quv jarayoni",
  [`${BASE}/results`]: "Natija",
  [`${BASE}/notifications`]: "Bildirishnomalar",
  [`${BASE}/profile`]: "Profil",
};

export function getRetrainingPageTitle(pathname: string) {
  if (pathname.includes("/courses/") && !pathname.endsWith("/courses")) return "Kurs haqida";
  if (pathname.includes("/learning/")) return "O'quv jarayoni";
  return titles[pathname] ?? "Qayta tayyorlash";
}

export const retrainingProgram: StudentProgramConfig = {
  kind: "retraining",
  homePath: BASE,
  basePath: BASE,
  tagline: "Qayta tayyorlash platformasi",
  navItems: retrainingNavItems,
  bottomNavItems: retrainingBottomNavItems,
  pageTitle: getRetrainingPageTitle,
};

export const retrainingMenuLabels: Record<string, string> = {
  courses: "Kurslar",
  applications: "Ariza",
  myCourses: "Mening kurslarim",
  learning: "O'quv jarayoni",
  results: "Natija",
  notifications: "Bildirishnomalar",
  profile: "Profil",
};

export const retrainingMenuShort: Record<string, string> = {
  courses: "Kurslar",
  myCourses: "Kurslarim",
  learning: "O'quv",
  results: "Natija",
  notifications: "Habar",
};
