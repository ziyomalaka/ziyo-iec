export const applicationStatusLabel: Record<string, string> = {
  pending: "Kutilmoqda",
  processing: "Ko'rib chiqilmoqda",
  approved: "Tasdiqlangan",
  rejected: "Rad etilgan",
  archived: "Arxiv",
};

export const accountStatusLabel: Record<string, string> = {
  active: "Faol",
  inactive: "Faol emas",
  blocked: "Bloklangan",
};

export const appealStatusLabel: Record<string, string> = {
  open: "Ochiq",
  in_progress: "Jarayonda",
  resolved: "Hal qilingan",
  rejected: "Rad etilgan",
};

export const staffRoleLabel: Record<string, string> = {
  boshqaruv: "Boshqaruv",
  nazoratchi: "Nazoratchi",
  it: "IT",
  student: "Foydalanuvchi",
};

export const itMaterialTypeLabel: Record<string, string> = {
  video: "Video",
  presentation: "Taqdimot",
  lecture: "Ma'ruza matni",
  seminar: "Seminar",
  laboratory: "Laboratoriya",
  test: "Test",
  pdf: "PDF",
  word: "Word",
};

export function uiLabel(value?: string | null, fallback?: Record<string, string>) {
  if (!value) return "—";
  return fallback?.[value] ?? value;
}

export function applicationBadge(
  status?: string
): "warning" | "info" | "success" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  if (status === "processing") return "info";
  if (status === "archived") return "neutral";
  return "warning";
}

export function accountBadge(status?: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "blocked") return "danger";
  if (status === "inactive") return "warning";
  return "neutral";
}
