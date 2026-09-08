import { studentApplicationKind } from "@/lib/dashboard/student-status";

export function retrainingStatusCard(status?: string | null) {
  const kind = studentApplicationKind(status);
  if (kind === "approved") {
    return {
      kind,
      label: "Tasdiqlandi",
      emoji: "🟢",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }
  if (kind === "rejected") {
    return {
      kind,
      label: "Rad etildi",
      emoji: "🔴",
      className: "border-red-200 bg-red-50 text-red-800",
    };
  }
  return {
    kind,
    label: "Ko'rib chiqilmoqda",
    emoji: "🟡",
    className: "border-amber-200 bg-amber-50 text-amber-800",
  };
}
