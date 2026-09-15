import { normalizeRetrainingType, retrainingHomePath } from "@/lib/retraining/kind";

export type StaffRole = "boshqaruv" | "nazoratchi" | "it";
export type AppRole = "student" | StaffRole | string;

export const DEV_STAFF_NICKNAMES = ["boshqaruv", "dasturiytaminot"] as const;

export function isDevStaffNickname(value?: string | null) {
  const nickname = value?.trim().toLowerCase();
  return nickname === "boshqaruv" || nickname === "dasturiytaminot";
}

/** Backend `IT` / `it_admin` kabi variantlarni frontend `it` ga keltiradi. */
export function normalizeAppRole(role?: string | null): string {
  const raw = (role ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (raw === "it" || raw === "it_admin") return "it";
  if (raw === "nazoratchi" || raw === "supervisor") return "nazoratchi";
  if (raw === "boshqaruv") return "boshqaruv";
  if (raw === "student" || raw === "client" || raw === "user") return "student";
  return raw;
}

export function isStaffRole(role?: string | null): role is StaffRole {
  const normalized = normalizeAppRole(role);
  return normalized === "boshqaruv" || normalized === "nazoratchi" || normalized === "it";
}

export function canAccessManagement(role?: string | null) {
  const normalized = normalizeAppRole(role);
  return normalized === "boshqaruv" || normalized === "it";
}

export function canAccessSupervisor(role?: string | null) {
  const normalized = normalizeAppRole(role);
  return normalized === "nazoratchi" || normalized === "it";
}

export function canAccessIt(role?: string | null) {
  return normalizeAppRole(role) === "it";
}

export function getPostLoginPath(
  role?: string | null,
  programType?: string | null,
  retrainingType?: string | null
) {
  switch (normalizeAppRole(role)) {
    case "boshqaruv":
      return "/admin/management";
    case "nazoratchi":
      return "/admin/supervisor";
    case "it":
      return "/admin/software/qualification";
    default: {
      const program = (programType ?? "").trim().toUpperCase();
      if (program === "MALAKA_OSHIRISH") return "/dashboard";
      if (program === "QAYTA_TAYYORLASH") {
        return retrainingHomePath(normalizeRetrainingType(retrainingType));
      }
      return "/select-program";
    }
  }
}

export function rolesConflict(userRole?: string | null, tokenRole?: string | null) {
  if (!tokenRole) return false;
  const user = normalizeAppRole(userRole);
  const token = normalizeAppRole(tokenRole);
  if (!user || !token) return false;
  const known = new Set(["it", "nazoratchi", "boshqaruv", "student"]);
  if (!known.has(user) || !known.has(token)) return false;
  return user !== token;
}

export function roleLabel(role?: string | null) {
  const normalized = normalizeAppRole(role);
  if (normalized === "boshqaruv") return "Boshqaruv";
  if (normalized === "nazoratchi") return "Nazoratchi";
  if (normalized === "it") return "IT";
  return "Foydalanuvchi";
}
