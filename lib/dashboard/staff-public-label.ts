const HIDDEN_ROLE_CODES = new Set([
  "it",
  "boshqaruv",
  "nazoratchi",
  "admin",
  "administrator",
  "staff",
  "supervisor",
]);

/** Mijozga ichki rol kodi ko'rsatilmaydi — har doim "Nazoratchi". */
export function studentStaffRoleLabel() {
  return "Nazoratchi";
}

export function studentStaffDisplayName(name?: string | null) {
  const raw = (name ?? "").trim();
  if (!raw) return studentStaffRoleLabel();
  if (HIDDEN_ROLE_CODES.has(raw.toLowerCase())) return studentStaffRoleLabel();
  return raw;
}

export function personInitials(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return letters || "N";
}
