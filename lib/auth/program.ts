import { getProfile, updateProgramType, updateRetrainingType } from "@/lib/api/profile";
import { getAuthUser, updateAuthUser } from "@/lib/auth/session";
import { isStaffRole, getPostLoginPath } from "@/lib/auth/roles";
import { PROGRAM_TYPES, type ProgramType } from "@/lib/validations/register";
import type { StudentProgramKind } from "@/lib/dashboard/program-context";
import type { UserResponse } from "@/lib/api/types/auth";
import type { ProfileResponse } from "@/lib/api/types/profile";
import { backendRetrainingTypeParam } from "@/lib/retraining/backend-type";
import { normalizeRetrainingType, RETRAINING_SELECT_PATH, retrainingHomePath } from "@/lib/retraining/kind";
import { getTempProgramType, isRetrainingApiEnabled, setTempProgramType } from "@/lib/retraining/temp-state";
import { ApiError } from "@/lib/api/errors";

export const SELECT_PROGRAM_PATH = "/select-program";
export const MALAKA_HOME_PATH = "/dashboard";
export const RETRAINING_HOME_PATH = "/retraining/general";
export { RETRAINING_SELECT_PATH };

export type { ProgramType };

/** Backenddan kelgan qiymatni qat'iy ProgramType'ga keltiradi; bo'sh/noma'lum bo'lsa null. */
export function normalizeProgramType(value?: string | null): ProgramType | null {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return PROGRAM_TYPES.includes(key as ProgramType) ? (key as ProgramType) : null;
}

/** MALAKA → Malaka; QAYTA + type → panel; QAYTA + null → select-type. */
export function programHomePath(program: ProgramType | null, retrainingType?: string | null) {
  if (program === "MALAKA_OSHIRISH") return MALAKA_HOME_PATH;
  if (program === "QAYTA_TAYYORLASH") {
    const type = normalizeRetrainingType(retrainingType);
    return type ? retrainingHomePath(type) : RETRAINING_SELECT_PATH;
  }
  return SELECT_PROGRAM_PATH;
}

export function needsRetrainingTypeSelect(program?: string | null, retrainingType?: string | null) {
  return normalizeProgramType(program) === "QAYTA_TAYYORLASH" && !normalizeRetrainingType(retrainingType);
}

export function programKind(program: ProgramType): StudentProgramKind {
  return program === "QAYTA_TAYYORLASH" ? "retraining" : "malaka";
}

type ProgramCache = {
  program: ProgramType | null;
  retrainingType: string | null;
};

let cached: ProgramCache | null = null;
let inflight: Promise<ProgramCache> | null = null;

export function resetProgramTypeCache() {
  cached = null;
  inflight = null;
}

function primeProgramTypeCache(program: ProgramType | null, retrainingType?: string | null) {
  cached = { program, retrainingType: retrainingType ?? null };
  updateAuthUser({
    program_type: program ?? "",
    retraining_type: retrainingType ?? null,
  });
}

function primeFromProfile(profile: ProfileResponse) {
  const program = normalizeProgramType(profile.program_type);
  primeProgramTypeCache(program, profile.retraining_type ?? null);
  return cached!;
}

/**
 * Yagona manba: authenticated profil javobi (GET /profile).
 * Natija sessiya davomida keshlanadi; localStorage faqat ko'zgu, manba emas.
 */
export async function fetchStudentProgram(force = false): Promise<ProgramCache> {
  if (!force && cached) return cached;
  if (force) inflight = null;

  if (!inflight) {
    inflight = getProfile()
      .then((profile) => primeFromProfile(profile))
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

export async function fetchProgramType(force = false): Promise<ProgramType | null> {
  return (await fetchStudentProgram(force)).program;
}

/** Tanlovni backendga saqlaydi va backend javobidan tasdiqlangan qiymatni qaytaradi. */
export async function saveProgramType(program: ProgramType): Promise<ProgramType | null> {
  const profile = await updateProgramType(program);
  const saved = normalizeProgramType(profile.program_type);
  if (saved) {
    primeProgramTypeCache(saved, profile.retraining_type ?? null);
    return saved;
  }

  // Ba'zi javoblarda program_type qaytmaydi — profilni qayta o'qib tekshiramiz.
  return fetchProgramType(true);
}

/** GET /profile dan program_type / retraining_type ni sessiyaga yozadi. */
export async function refreshCurrentUser(): Promise<UserResponse> {
  const snapshot = await fetchStudentProgram(true);
  const user = getAuthUser();
  if (!user) {
    throw new ApiError(401, "Sessiya topilmadi.");
  }
  return {
    ...user,
    program_type: snapshot.program ?? user.program_type ?? null,
    retraining_type: snapshot.retrainingType ?? null,
  };
}

/** PUT /retraining/retraining-type, so'ng GET /profile. Success bo'lmasa panelga o'tilmaydi. */
export async function saveRetrainingType(retrainingType: string) {
  const backendValue = backendRetrainingTypeParam(retrainingType) ?? retrainingType;
  const profile = await updateRetrainingType(backendValue);
  resetProgramTypeCache();
  const user = await refreshCurrentUser();
  const saved =
    normalizeRetrainingType(user.retraining_type) ??
    normalizeRetrainingType(profile.retraining_type);
  if (!saved) {
    throw new ApiError(400, "Qayta tayyorlash turi saqlanmadi.");
  }
  primeProgramTypeCache(
    normalizeProgramType(user.program_type) ?? "QAYTA_TAYYORLASH",
    user.retraining_type ?? profile.retraining_type ?? saved
  );
  return saved;
}

/** LOGIN SUCCESS -> profil -> program_type -> route. */
export async function resolvePostLoginPath(user: UserResponse): Promise<string> {
  if (isStaffRole(user.role)) return getPostLoginPath(user.role);

  resetProgramTypeCache();

  const fromLogin = normalizeProgramType(user.program_type);
  if (fromLogin) {
    primeProgramTypeCache(fromLogin, user.retraining_type ?? null);
    if (!isRetrainingApiEnabled()) setTempProgramType(fromLogin);
    if (fromLogin === "QAYTA_TAYYORLASH" && !normalizeRetrainingType(user.retraining_type)) {
      try {
        const snapshot = await fetchStudentProgram(true);
        return programHomePath(snapshot.program ?? fromLogin, snapshot.retrainingType);
      } catch {
        return RETRAINING_SELECT_PATH;
      }
    }
    return programHomePath(fromLogin, user.retraining_type);
  }

  if (!isRetrainingApiEnabled()) {
    const temp = getTempProgramType();
    if (temp) {
      primeProgramTypeCache(temp, null);
      return programHomePath(temp);
    }
  }

  try {
    const snapshot = await fetchStudentProgram(true);
    return programHomePath(snapshot.program, snapshot.retrainingType);
  } catch {
    if (!isRetrainingApiEnabled()) {
      const temp = getTempProgramType();
      if (temp) return programHomePath(temp);
    }
    return SELECT_PROGRAM_PATH;
  }
}

/** Profil o'qilmagan holatlar uchun zaxira (masalan admin guard) — manba emas, taxmin. */
export function getSessionProgramType(): ProgramType | null {
  return normalizeProgramType(getAuthUser()?.program_type);
}
