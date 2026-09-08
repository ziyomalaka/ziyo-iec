import { getProfile, updateProgramType } from "@/lib/api/profile";
import { getAuthUser, updateAuthUser } from "@/lib/auth/session";
import { isStaffRole, getPostLoginPath } from "@/lib/auth/roles";
import { PROGRAM_TYPES, type ProgramType } from "@/lib/validations/register";
import type { StudentProgramKind } from "@/lib/dashboard/program-context";
import type { UserResponse } from "@/lib/api/types/auth";

export const SELECT_PROGRAM_PATH = "/select-program";
export const MALAKA_HOME_PATH = "/dashboard";
export const RETRAINING_HOME_PATH = "/retraining";

export type { ProgramType };

/** Backenddan kelgan qiymatni qat'iy ProgramType'ga keltiradi; bo'sh/noma'lum bo'lsa null. */
export function normalizeProgramType(value?: string | null): ProgramType | null {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return PROGRAM_TYPES.includes(key as ProgramType) ? (key as ProgramType) : null;
}

/** program_type bo'sh bo'lsa hech qachon avtomatik dastur berilmaydi — tanlash sahifasi. */
export function programHomePath(program: ProgramType | null) {
  if (program === "QAYTA_TAYYORLASH") return RETRAINING_HOME_PATH;
  if (program === "MALAKA_OSHIRISH") return MALAKA_HOME_PATH;
  return SELECT_PROGRAM_PATH;
}

export function programKind(program: ProgramType): StudentProgramKind {
  return program === "QAYTA_TAYYORLASH" ? "retraining" : "malaka";
}

let cached: { value: ProgramType | null } | null = null;
let inflight: Promise<ProgramType | null> | null = null;

export function resetProgramTypeCache() {
  cached = null;
  inflight = null;
}

function primeProgramTypeCache(value: ProgramType | null) {
  cached = { value };
  updateAuthUser({ program_type: value ?? "" });
}

/**
 * Yagona manba: authenticated profil javobi (GET /profile).
 * Natija sessiya davomida keshlanadi; localStorage faqat ko'zgu, manba emas.
 */
export async function fetchProgramType(force = false): Promise<ProgramType | null> {
  if (!force && cached) return cached.value;
  if (force) inflight = null;

  if (!inflight) {
    inflight = getProfile()
      .then((profile) => {
        const value = normalizeProgramType(profile.program_type);
        primeProgramTypeCache(value);
        return value;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}

/** Tanlovni backendga saqlaydi va backend javobidan tasdiqlangan qiymatni qaytaradi. */
export async function saveProgramType(program: ProgramType): Promise<ProgramType | null> {
  const profile = await updateProgramType(program);
  const saved = normalizeProgramType(profile.program_type);
  if (saved) {
    primeProgramTypeCache(saved);
    return saved;
  }

  // Ba'zi javoblarda program_type qaytmaydi — profilni qayta o'qib tekshiramiz.
  return fetchProgramType(true);
}

/** LOGIN SUCCESS -> profil -> program_type -> route. */
export async function resolvePostLoginPath(user: UserResponse): Promise<string> {
  if (isStaffRole(user.role)) return getPostLoginPath(user.role);

  resetProgramTypeCache();

  const fromLogin = normalizeProgramType(user.program_type);
  if (fromLogin) {
    primeProgramTypeCache(fromLogin);
    return programHomePath(fromLogin);
  }

  try {
    return programHomePath(await fetchProgramType(true));
  } catch {
    return SELECT_PROGRAM_PATH;
  }
}

/** Profil o'qilmagan holatlar uchun zaxira (masalan admin guard) — manba emas, taxmin. */
export function getSessionProgramType(): ProgramType | null {
  return normalizeProgramType(getAuthUser()?.program_type);
}
