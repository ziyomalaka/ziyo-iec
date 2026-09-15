"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath, isStaffRole } from "@/lib/auth/roles";
import {
  MALAKA_HOME_PATH,
  RETRAINING_SELECT_PATH,
  SELECT_PROGRAM_PATH,
  fetchStudentProgram,
  programHomePath,
  programKind,
} from "@/lib/auth/program";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { normalizeRetrainingType, retrainingHomePath } from "@/lib/retraining/kind";
import { isRetrainingApiEnabled, resolveFrontendProgram } from "@/lib/retraining/temp-state";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { kind, retrainingKind } = useStudentProgramPaths();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const finishRetraining = (profileType?: string | null) => {
      const fromUser = normalizeRetrainingType(profileType ?? getAuthUser()?.retraining_type);
      if (!fromUser) {
        router.replace(RETRAINING_SELECT_PATH);
        return;
      }
      if (retrainingKind && retrainingKind !== fromUser) {
        router.replace(retrainingHomePath(fromUser));
        return;
      }
      setReady(true);
    };

    const token = getAuthToken();
    if (!token) {
      if (!isRetrainingApiEnabled() && kind === "retraining") {
        finishRetraining();
        return;
      }
      router.replace("/kirish");
      return;
    }

    const role = getAuthUser()?.role;
    if (isStaffRole(role)) {
      router.replace(getPostLoginPath(role));
      return;
    }

    if (!isRetrainingApiEnabled()) {
      const program = resolveFrontendProgram();
      if (kind === "retraining") {
        if (program === "MALAKA_OSHIRISH") {
          router.replace(MALAKA_HOME_PATH);
          return;
        }
        finishRetraining();
        return;
      }
      if (program === "QAYTA_TAYYORLASH") {
        router.replace(programHomePath(program));
        return;
      }
      setReady(true);
      return;
    }

    fetchStudentProgram()
      .then((snapshot) => {
        if (!active) return;
        const program = snapshot.program;

        if (!program) {
          const temp = resolveFrontendProgram();
          if (temp === "QAYTA_TAYYORLASH") {
            if (kind === "retraining") {
              finishRetraining(snapshot.retrainingType);
              return;
            }
            router.replace(programHomePath(temp, snapshot.retrainingType));
            return;
          }
          if (temp === "MALAKA_OSHIRISH" && kind === "malaka") {
            setReady(true);
            return;
          }
          router.replace(SELECT_PROGRAM_PATH);
          return;
        }

        if (programKind(program) !== kind) {
          router.replace(programHomePath(program, snapshot.retrainingType));
          return;
        }

        if (program === "QAYTA_TAYYORLASH") {
          finishRetraining(snapshot.retrainingType);
          return;
        }

        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        const temp = resolveFrontendProgram();
        if (kind === "retraining" && temp !== "MALAKA_OSHIRISH") {
          finishRetraining();
          return;
        }
        if (kind === "malaka" && temp === "QAYTA_TAYYORLASH") {
          router.replace(programHomePath(temp));
          return;
        }
        setReady(true);
      });

    return () => {
      active = false;
    };
  }, [kind, retrainingKind, router]);

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
