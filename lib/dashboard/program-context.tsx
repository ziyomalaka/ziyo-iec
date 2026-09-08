"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DashboardNavItem } from "@/lib/dashboard/navigation";
import {
  COURSES_API_PREFIX,
  LEARNING_API_PREFIX,
  NOTIFICATIONS_API_PREFIX,
} from "@/lib/api/student-api";

export type StudentProgramKind = "malaka" | "retraining";

export type StudentProgramConfig = {
  kind: StudentProgramKind;
  homePath: string;
  basePath: string;
  tagline: string;
  navItems: DashboardNavItem[];
  bottomNavItems: DashboardNavItem[];
  pageTitle: (pathname: string) => string;
};

const StudentProgramContext = createContext<StudentProgramConfig | null>(null);

export function StudentProgramProvider({
  value,
  children,
}: {
  value: StudentProgramConfig;
  children: ReactNode;
}) {
  return <StudentProgramContext.Provider value={value}>{children}</StudentProgramContext.Provider>;
}

export function useStudentProgram(): StudentProgramConfig | null {
  return useContext(StudentProgramContext);
}

export function useStudentProgramPaths() {
  const program = useStudentProgram();
  const kind: StudentProgramKind = program?.kind ?? "malaka";
  const base = program?.basePath ?? "/dashboard";
  return {
    kind,
    home: program?.homePath ?? "/dashboard",
    base,
    courses: `${base}/courses`,
    applications: `${base}/applications`,
    myCourses: `${base}/my-courses`,
    learning: `${base}/learning`,
    results: `${base}/results`,
    notifications: `${base}/notifications`,
    profile: `${base}/profile`,
    tagline: program?.tagline ?? "Malaka oshirish platformasi",
    navItems: program?.navItems ?? null,
    bottomNavItems: program?.bottomNavItems ?? null,
    pageTitle: program?.pageTitle ?? null,
    learningApi: LEARNING_API_PREFIX[kind],
    notificationsApi: NOTIFICATIONS_API_PREFIX[kind],
    coursesApi: COURSES_API_PREFIX[kind],
  };
}
