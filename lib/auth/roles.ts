export type StaffRole = "boshqaruv" | "nazoratchi" | "it";
export type AppRole = "student" | StaffRole | string;

export const DEV_STAFF_NICKNAMES = ["boshqaruv", "dasturiytaminot"] as const;

export function isDevStaffNickname(value?: string | null) {
  const nickname = value?.trim().toLowerCase();
  return nickname === "boshqaruv" || nickname === "dasturiytaminot";
}

export function isStaffRole(role?: string | null): role is StaffRole {
  return role === "boshqaruv" || role === "nazoratchi" || role === "it";
}

export function canAccessManagement(role?: string | null) {
  return role === "boshqaruv" || role === "it";
}

export function canAccessSupervisor(role?: string | null) {
  return role === "nazoratchi" || role === "it";
}

export function canAccessIt(role?: string | null) {
  return role === "it";
}

export function getPostLoginPath(role?: string | null, programType?: string | null) {
  switch (role) {
    case "boshqaruv":
      return "/admin/management";
    case "nazoratchi":
      return "/admin/supervisor";
    case "it":
      return "/admin/software/qualification";
    default: {
      const program = (programType ?? "").trim().toUpperCase();
      if (program === "QAYTA_TAYYORLASH") return "/retraining";
      if (program === "MALAKA_OSHIRISH") return "/dashboard";
      // Bo'sh program_type — avtomatik dastur berilmaydi, user o'zi tanlaydi.
      return "/select-program";
    }
  }
}

export function roleLabel(role?: string | null) {
  if (role === "boshqaruv") return "Boshqaruv";
  if (role === "nazoratchi") return "Nazoratchi";
  if (role === "it") return "IT";
  return "Foydalanuvchi";
}
