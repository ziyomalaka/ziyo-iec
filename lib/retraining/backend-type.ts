import type { RetrainingPanel, RetrainingType as AdminRetrainingType } from "@/lib/retraining/admin-panels";
import { getRetrainingPanelConfig, panelFromRetrainingType, RETRAINING_PANELS } from "@/lib/retraining/admin-panels";
import type { RetrainingType as StudentRetrainingType } from "@/lib/retraining/kind";
import { normalizeRetrainingType, parseRetrainingSegment } from "@/lib/retraining/kind";

/** Backend (admin-it / profil) — Swagger: UMUMIY_|KASBIY_|PEDAGOGIK_QAYTA_TAYYORLASH */
export const BACKEND_RETRAINING_TYPE: Record<StudentRetrainingType, AdminRetrainingType> = {
  UMUMIY: "UMUMIY_QAYTA_TAYYORLASH",
  KASBIY: "KASBIY_QAYTA_TAYYORLASH",
  PEDAGOGIK: "PEDAGOGIK_QAYTA_TAYYORLASH",
};

const BACKEND_TO_STUDENT: Record<string, StudentRetrainingType> = {
  UMUMIY: "UMUMIY",
  UMUMIY_QAYTA_TAYYORLASH: "UMUMIY",
  KASBIY: "KASBIY",
  KASBIY_QAYTA_TAYYORLASH: "KASBIY",
  PEDAGOGIK: "PEDAGOGIK",
  PEDAGOGIK_QAYTA_TAYYORLASH: "PEDAGOGIK",
};

export function backendRetrainingTypeFromPanel(panel: RetrainingPanel): AdminRetrainingType {
  return getRetrainingPanelConfig(panel).type;
}

export function backendRetrainingTypeFromStudent(type: StudentRetrainingType): AdminRetrainingType {
  return BACKEND_RETRAINING_TYPE[type];
}

export function studentRetrainingTypeFromBackend(value?: string | null): StudentRetrainingType | null {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!key) return null;
  return BACKEND_TO_STUDENT[key] ?? normalizeRetrainingType(key);
}

export function panelFromBackendRetrainingType(value?: string | null): RetrainingPanel | undefined {
  const fromAdmin = panelFromRetrainingType(value);
  if (fromAdmin) return fromAdmin;
  const student = studentRetrainingTypeFromBackend(value);
  if (!student) return undefined;
  if (student === "UMUMIY") return "umumiy";
  if (student === "PEDAGOGIK") return "pedagogik";
  if (student === "KASBIY") return "kasbiy";
  return undefined;
}

export function backendRetrainingTypeParam(value?: string | null): string | undefined {
  const panel = panelFromBackendRetrainingType(value);
  if (panel) return backendRetrainingTypeFromPanel(panel);
  const student = studentRetrainingTypeFromBackend(value);
  if (student) return backendRetrainingTypeFromStudent(student);
  const segment = parseRetrainingSegment(value ?? undefined);
  if (segment) return backendRetrainingTypeFromStudent(segment);
  return undefined;
}

export function retrainingTypeQueryValue(type?: StudentRetrainingType | null) {
  if (!type) return undefined;
  return backendRetrainingTypeFromStudent(type);
}

/** Client GET/POST retraining URL ga query qo'shilmaydi — type user profilida. */
export function appendRetrainingTypeQuery(path: string, _retrainingType?: string | null) {
  return path;
}

export { RETRAINING_PANELS };
