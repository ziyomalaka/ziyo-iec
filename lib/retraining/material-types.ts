import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardList,
  FlaskConical,
  MessageSquare,
  MonitorPlay,
  Presentation,
  Video,
} from "lucide-react";

/** Qayta tayyorlash canonical material types (backend contract). */
export type RetrainingMaterialType =
  | "VIDEO"
  | "LECTURE"
  | "MUSTAQIL_ISH"
  | "PRESENTATION"
  | "GUIDE"
  | "SEMINAR"
  | "LABORATORY"
  | "TEST";

export const RETRAINING_MATERIAL_TYPES: {
  value: RetrainingMaterialType;
  label: string;
  icon: LucideIcon;
  needsFile: boolean;
}[] = [
  { value: "VIDEO", label: "Video", icon: Video, needsFile: true },
  { value: "PRESENTATION", label: "Taqdimot", icon: Presentation, needsFile: true },
  { value: "LECTURE", label: "Ma'ruza", icon: BookOpen, needsFile: false },
  { value: "MUSTAQIL_ISH", label: "Mustaqil ish", icon: ClipboardList, needsFile: false },
  { value: "GUIDE", label: "Qo'llanma", icon: BookOpen, needsFile: false },
  { value: "SEMINAR", label: "Seminar", icon: MessageSquare, needsFile: false },
  { value: "LABORATORY", label: "Laboratoriya", icon: FlaskConical, needsFile: false },
  { value: "TEST", label: "Test", icon: MonitorPlay, needsFile: false },
];

/** 3 panel UI: Video / Taqdimot / Ma'ruza / Mustaqil ish. */
export const RETRAINING_PANEL_MATERIAL_TYPES = RETRAINING_MATERIAL_TYPES.filter((item) =>
  item.value === "VIDEO" ||
  item.value === "PRESENTATION" ||
  item.value === "LECTURE" ||
  item.value === "MUSTAQIL_ISH"
);

const VIDEO_EXTS = [
  "mp4",
  "webm",
  "mov",
  "mkv",
  "avi",
  "m4v",
  "mpeg",
  "mpg",
  "3gp",
  "wmv",
  "flv",
  "ts",
  "ogv",
] as const;
const PRESENTATION_EXTS = ["pdf", "doc", "docx", "ppt", "pptx"] as const;
const DOCUMENT_EXTS = [...PRESENTATION_EXTS, "xls", "xlsx", "zip", "rar", "txt", "rtf"] as const;

export function fileExtension(name?: string | null) {
  const raw = String(name ?? "").trim();
  const dot = raw.lastIndexOf(".");
  return dot >= 0 ? raw.slice(dot + 1).toLowerCase() : "";
}

export function retrainingMaterialFileRule(type?: string | null): {
  required: boolean;
  accept?: string;
  hint: string;
  exts: readonly string[];
} {
  const upper = (type ?? "").toUpperCase();
  if (upper === "VIDEO") {
    return {
      required: true,
      accept: ["video/*", ...VIDEO_EXTS.map((ext) => `.${ext}`)].join(","),
      hint: "mp4, webm, mov, mkv va boshqa video",
      exts: VIDEO_EXTS,
    };
  }
  if (upper === "PRESENTATION") {
    return {
      required: true,
      accept: PRESENTATION_EXTS.map((ext) => `.${ext}`).join(","),
      hint: "pdf, doc, docx, ppt, pptx",
      exts: PRESENTATION_EXTS,
    };
  }
  if (upper === "LECTURE" || upper === "MUSTAQIL_ISH") {
    return { required: false, hint: "ixtiyoriy", exts: [] };
  }
  return { required: false, hint: "ixtiyoriy", exts: [] };
}

export function retrainingMaterialFileError(type?: string | null, file?: File | string | null) {
  const rule = retrainingMaterialFileRule(type);
  const fileName = typeof file === "string" ? file : file?.name ?? "";
  const mime = typeof file === "object" && file ? file.type : "";
  if (!fileName.trim() && !(typeof file === "object" && file)) {
    return rule.required ? "Fayl tanlang" : null;
  }
  const ext = fileExtension(fileName);
  const upper = (type ?? "").toUpperCase();
  if (upper === "VIDEO") {
    if (mime.startsWith("video/")) return null;
    if (ext && DOCUMENT_EXTS.includes(ext as (typeof DOCUMENT_EXTS)[number])) {
      return "Video fayl tanlang (mp4, webm, mov, mkv…)";
    }
    return null;
  }
  if (upper === "PRESENTATION" && rule.exts.length && ext && !rule.exts.includes(ext)) {
    return `Faqat ${rule.hint} fayllar`;
  }
  return null;
}

export function retrainingMaterialLabel(type?: string | null) {
  const upper = (type ?? "").toUpperCase();
  return RETRAINING_MATERIAL_TYPES.find((item) => item.value === upper)?.label ?? type ?? "Material";
}

export function retrainingMaterialIcon(type?: string | null): LucideIcon {
  const upper = (type ?? "").toUpperCase();
  return RETRAINING_MATERIAL_TYPES.find((item) => item.value === upper)?.icon ?? BookOpen;
}

export function retrainingMaterialNeedsFile(type?: string | null) {
  const upper = (type ?? "").toUpperCase();
  const found = RETRAINING_MATERIAL_TYPES.find((item) => item.value === upper);
  return found?.needsFile ?? true;
}

export const CANONICAL_RETRAINING_MATERIAL_TYPES = RETRAINING_MATERIAL_TYPES.map((item) => item.value);

/** POST /lessons/{id}/materials — TEST alohida endpoint. */
export const API_RETRAINING_MATERIAL_TYPES = CANONICAL_RETRAINING_MATERIAL_TYPES.filter(
  (item) => item !== "TEST"
);

/**
 * Eski `lesson_materials_type_check` (malaka swagger) — LECTURE/MUSTAQIL_ISH yo'q.
 * 23514 canonical type bilan ham bo'lsa, odatda DB migration kerak.
 */
export const LEGACY_LESSON_MATERIAL_DB_TYPES = [
  "VIDEO",
  "PRESENTATION",
  "GUIDE",
  "SEMINAR",
  "LABORATORY",
] as const;

export function isLegacyLessonMaterialDbType(type: string) {
  return LEGACY_LESSON_MATERIAL_DB_TYPES.includes(
    type.trim().toUpperCase() as (typeof LEGACY_LESSON_MATERIAL_DB_TYPES)[number]
  );
}

type NormalizeSource = "wizard" | "retraining";

function aliasKey(value?: string | null) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

const RETRAINING_ALIASES: Record<string, RetrainingMaterialType> = {
  VIDEO: "VIDEO",
  LECTURE: "LECTURE",
  MARUZA: "LECTURE",
  MA_RUZA: "LECTURE",
  MA_RUZA_MATNI: "LECTURE",
  GUIDE: "GUIDE",
  QOLLANMA: "GUIDE",
  MUSTAQIL: "MUSTAQIL_ISH",
  MUSTAQIL_ISH: "MUSTAQIL_ISH",
  INDEPENDENT_WORK: "MUSTAQIL_ISH",
  PRESENTATION: "PRESENTATION",
  TAQDIMOT: "PRESENTATION",
  PPT: "PRESENTATION",
  PDF: "PRESENTATION",
  DOC: "PRESENTATION",
  DOCX: "PRESENTATION",
  PPTX: "PRESENTATION",
  SEMINAR: "SEMINAR",
  LABORATORY: "LABORATORY",
  LAB: "LABORATORY",
  TEST: "TEST",
};

/** Malaka wizard `GUIDE` = Ma'ruza matni → retraining DB `LECTURE`. */
const WIZARD_ALIASES: Record<string, RetrainingMaterialType> = {
  VIDEO: "VIDEO",
  PRESENTATION: "PRESENTATION",
  GUIDE: "LECTURE",
  SEMINAR: "SEMINAR",
  LABORATORY: "LABORATORY",
  TEST: "TEST",
};

/**
 * Backend `lesson_materials.type` uchun canonical qiymat.
 * UI label yoki alias yuborilmasin.
 */
export function normalizeMaterialType(
  value?: string | null,
  source: NormalizeSource = "retraining"
): RetrainingMaterialType | null {
  const key = aliasKey(value);
  if (!key) return null;
  const mapped =
    source === "wizard"
      ? WIZARD_ALIASES[key] ?? RETRAINING_ALIASES[key]
      : RETRAINING_ALIASES[key];
  if (mapped) return mapped;
  if (CANONICAL_RETRAINING_MATERIAL_TYPES.includes(key as RetrainingMaterialType)) {
    return key as RetrainingMaterialType;
  }
  return null;
}
