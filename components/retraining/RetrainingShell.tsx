"use client";

import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import { StudentProgramProvider } from "@/lib/dashboard/program-context";
import { retrainingProgram } from "@/lib/retraining/navigation";

export default function RetrainingShell({ children }: { children: React.ReactNode }) {
  return (
    <StudentProgramProvider value={retrainingProgram}>
      <DashboardShell>{children}</DashboardShell>
    </StudentProgramProvider>
  );
}
