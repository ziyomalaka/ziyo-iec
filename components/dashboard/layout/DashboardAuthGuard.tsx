"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath, isStaffRole } from "@/lib/auth/roles";
import {
  SELECT_PROGRAM_PATH,
  fetchProgramType,
  programHomePath,
  programKind,
} from "@/lib/auth/program";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { kind } = useStudentProgramPaths();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const token = getAuthToken();
    if (!token) {
      router.replace("/kirish");
      return;
    }

    const role = getAuthUser()?.role;
    if (isStaffRole(role)) {
      router.replace(getPostLoginPath(role));
      return;
    }

    // Manba — backend profili; yuklanmaguncha redirect qilinmaydi.
    fetchProgramType()
      .then((program) => {
        if (!active) return;

        if (!program) {
          router.replace(SELECT_PROGRAM_PATH);
          return;
        }

        if (programKind(program) !== kind) {
          router.replace(programHomePath(program));
          return;
        }

        setReady(true);
      })
      .catch(() => {
        // Profil o'qilmasa (tarmoq/server xatosi) userni noto'g'ri panelga uloqtirmaymiz;
        // kirishni backend API'ning o'zi tekshiradi.
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [kind, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] p-6">
        <div className="w-full max-w-3xl">
          <LoadingState />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
