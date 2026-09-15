import { Award, Bell, BookMarked, BookOpen, FileText, GraduationCap } from "lucide-react";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import type { StudentProgramConfig } from "@/lib/dashboard/program-context";
import {
  RETRAINING_TYPE_META,
  retrainingBasePath,
  type RetrainingType,
} from "@/lib/retraining/kind";

function createRetrainingNav(base: string): DashboardNavItem[] {
  return [
    { href: `${base}/courses`, labelKey: "courses", icon: GraduationCap, exact: true },
    { href: `${base}/application`, labelKey: "applications", icon: FileText },
    { href: `${base}/my-courses`, labelKey: "myCourses", icon: BookOpen },
    { href: `${base}/learning`, labelKey: "learning", icon: BookMarked },
    { href: `${base}/results`, labelKey: "results", icon: Award },
    { href: `${base}/notifications`, labelKey: "notifications", icon: Bell },
  ];
}

function createRetrainingBottomNav(base: string): DashboardNavItem[] {
  return [
    { href: `${base}/courses`, labelKey: "courses", icon: GraduationCap },
    { href: `${base}/my-courses`, labelKey: "myCourses", icon: BookOpen },
    { href: `${base}/learning`, labelKey: "learning", icon: BookMarked },
    { href: `${base}/results`, labelKey: "results", icon: Award },
    { href: `${base}/notifications`, labelKey: "notifications", icon: Bell },
  ];
}

export function getRetrainingPageTitle(pathname: string, type: RetrainingType) {
  const meta = RETRAINING_TYPE_META[type];
  const base = retrainingBasePath(type);
  if (pathname.includes("/courses/") && !pathname.endsWith("/courses")) return "Kurs haqida";
  if (pathname.includes("/learning/")) return "O'quv jarayoni";
  const titles: Record<string, string> = {
    [base]: meta.title,
    [`${base}/courses`]: "Kurslar",
    [`${base}/application`]: "Ariza",
    [`${base}/applications`]: "Ariza",
    [`${base}/my-courses`]: "Mening kurslarim",
    [`${base}/learning`]: "O'quv jarayoni",
    [`${base}/results`]: "Natija",
    [`${base}/notifications`]: "Bildirishnomalar",
    [`${base}/profile`]: "Profil",
  };
  return titles[pathname] ?? meta.title;
}

export function createRetrainingProgram(type: RetrainingType): StudentProgramConfig {
  const meta = RETRAINING_TYPE_META[type];
  const base = retrainingBasePath(type);
  return {
    kind: "retraining",
    retrainingKind: type,
    homePath: base,
    basePath: base,
    tagline: meta.tagline,
    badge: meta.badge,
    navItems: createRetrainingNav(base),
    bottomNavItems: createRetrainingBottomNav(base),
    pageTitle: (pathname) => getRetrainingPageTitle(pathname, type),
  };
}

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
