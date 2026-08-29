import { ApiError } from "@/lib/api/errors";

export function studentApiErrorMessage(
  err: unknown,
  kind: "material" | "test" | "lesson" | "video" = "material"
): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Tizimga qayta kiring.";
    if (err.status === 403) {
      if (kind === "test") return "Ushbu testga kirishga ruxsat yo'q.";
      if (kind === "lesson") return "Ushbu darsga kirishga ruxsat yo'q.";
      return "Ushbu materialga kirishga ruxsat yo'q.";
    }
    if (err.status === 404) {
      if (kind === "test") return "Bu darsda test mavjud emas.";
      if (kind === "video") return "Video mavjud emas.";
      return "Material mavjud emas.";
    }
    if (err.status === 502 || err.status === 503) return "Server vaqtincha javob bermayapti.";
    if (err.status >= 500) return "Serverda xatolik.";
    return err.message || "Yuklashda muammo yuz berdi.";
  }
  if (err instanceof Error && err.message) return err.message;
  if (kind === "video") return "Videoni yuklashda muammo yuz berdi.";
  return "Yuklashda muammo yuz berdi.";
}
