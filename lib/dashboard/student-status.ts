export type StudentApplicationKind = "pending" | "approved" | "rejected";

export function studentApplicationKind(status?: string | null): StudentApplicationKind {
  const value = (status ?? "").trim().toLowerCase();
  if (value === "approved" || value === "accepted" || value === "tasdiqlangan" || value === "tasdiqlandi") {
    return "approved";
  }
  if (value === "rejected" || value === "declined" || value === "rad" || value.includes("rad etil")) {
    return "rejected";
  }
  return "pending";
}

export function studentApplicationLabel(status?: string | null) {
  const kind = studentApplicationKind(status);
  if (kind === "approved") return "Tasdiqlandi";
  if (kind === "rejected") return "Rad etildi";
  return "Ko'rib chiqilmoqda";
}

export function studentApplicationBadge(status?: string | null) {
  const kind = studentApplicationKind(status);
  if (kind === "approved") return "success" as const;
  if (kind === "rejected") return "danger" as const;
  return "info" as const;
}
