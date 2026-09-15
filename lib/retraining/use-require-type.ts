"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { ApiError } from "@/lib/api/errors";
import {
  needsRetrainingTypeSelect,
  refreshCurrentUser,
  RETRAINING_SELECT_PATH,
} from "@/lib/auth/program";
import { normalizeRetrainingType, type RetrainingType } from "@/lib/retraining/kind";

export function isRetrainingTypeMissingError(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 400) return false;
  return /qayta tayyorlash turi tanlanmagan/i.test(error.message);
}

/** Profil tipini tekshiradi; yo‘q bo‘lsa select-type ga yuboradi. */
export function useRequireRetrainingType() {
  const router = useRouter();

  return useCallback(async (): Promise<RetrainingType | null> => {
    const user = await refreshCurrentUser();
    if (needsRetrainingTypeSelect(user.program_type, user.retraining_type)) {
      router.replace(RETRAINING_SELECT_PATH);
      return null;
    }
    const type = normalizeRetrainingType(user.retraining_type);
    if (!type) {
      router.replace(RETRAINING_SELECT_PATH);
      return null;
    }
    return type;
  }, [router]);
}
