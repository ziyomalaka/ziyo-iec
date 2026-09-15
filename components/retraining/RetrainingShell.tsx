"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import DashboardShell from "@/components/dashboard/layout/DashboardShell";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { StudentProgramProvider } from "@/lib/dashboard/program-context";
import { getAuthUser } from "@/lib/auth/session";
import {
  normalizeRetrainingType,
  parseRetrainingPath,
  remapLegacyRetrainingPath,
  RETRAINING_SELECT_PATH,
} from "@/lib/retraining/kind";
import { createRetrainingProgram } from "@/lib/retraining/navigation";

function isSelectTypePath(pathname: string) {
  return pathname.includes("/retraining/select-type");
}

function RetrainingEntryRedirect() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const fromUser = normalizeRetrainingType(getAuthUser()?.retraining_type);
    if (!fromUser) {
      router.replace(RETRAINING_SELECT_PATH);
      return;
    }
    router.replace(remapLegacyRetrainingPath(pathname, fromUser));
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] p-6">
      <div className="w-full max-w-3xl">
        <LoadingState />
      </div>
    </div>
  );
}

export default function RetrainingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isSelectTypePath(pathname)) {
    return <>{children}</>;
  }

  const type = parseRetrainingPath(pathname);
  if (!type) {
    return <RetrainingEntryRedirect />;
  }

  return (
    <StudentProgramProvider value={createRetrainingProgram(type)}>
      <DashboardShell>{children}</DashboardShell>
    </StudentProgramProvider>
  );
}
