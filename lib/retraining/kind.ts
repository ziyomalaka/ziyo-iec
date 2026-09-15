import { RETRAINING_TYPES, type RetrainingType } from "@/lib/validations/register";
import {
  clearTempRetrainingType,
  getTempRetrainingType,
  setTempRetrainingType,
} from "@/lib/retraining/temp-state";

export type { RetrainingType };

export const RETRAINING_SELECT_PATH = "/retraining/select-type";
export const DEFAULT_RETRAINING_TYPE: RetrainingType = "UMUMIY";

export const RETRAINING_SEGMENT: Record<RetrainingType, "general" | "professional" | "pedagogical"> = {
  UMUMIY: "general",
  KASBIY: "professional",
  PEDAGOGIK: "pedagogical",
};

const SEGMENT_TO_TYPE: Record<string, RetrainingType> = {
  general: "UMUMIY",
  professional: "KASBIY",
  pedagogical: "PEDAGOGIK",
};

export type RetrainingTypeMeta = {
  type: RetrainingType;
  segment: "general" | "professional" | "pedagogical";
  title: string;
  subtitle: string;
  badge: string;
  tagline: string;
};

export const RETRAINING_TYPE_META: Record<RetrainingType, RetrainingTypeMeta> = {
  UMUMIY: {
    type: "UMUMIY",
    segment: "general",
    title: "Umumiy qayta tayyorlash",
    subtitle: "Umumiy bilim va ko‘nikmalarni yangilash",
    badge: "Umumiy qayta tayyorlash",
    tagline: "Umumiy qayta tayyorlash",
  },
  KASBIY: {
    type: "KASBIY",
    segment: "professional",
    title: "Kasbiy qayta tayyorlash",
    subtitle: "Yangi kasbiy yo‘nalish va amaliy ko‘nikmalar",
    badge: "Kasbiy qayta tayyorlash",
    tagline: "Kasbiy qayta tayyorlash",
  },
  PEDAGOGIK: {
    type: "PEDAGOGIK",
    segment: "pedagogical",
    title: "Pedagogik qayta tayyorlash",
    subtitle: "Pedagogik faoliyat uchun bilim va metodik ko‘nikmalar",
    badge: "Pedagogik qayta tayyorlash",
    tagline: "Pedagogik qayta tayyorlash",
  },
};

export function normalizeRetrainingType(value?: string | null): RetrainingType | null {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!key) return null;
  if (RETRAINING_TYPES.includes(key as RetrainingType)) return key as RetrainingType;
  if (key === "UMUMIY_QAYTA_TAYYORLASH") return "UMUMIY";
  if (key === "KASBIY_QAYTA_TAYYORLASH") return "KASBIY";
  if (key === "PEDAGOGIK_QAYTA_TAYYORLASH") return "PEDAGOGIK";
  return null;
}

export function parseRetrainingSegment(segment?: string | null): RetrainingType | null {
  if (!segment) return null;
  return SEGMENT_TO_TYPE[segment.trim().toLowerCase()] ?? null;
}

export function retrainingBasePath(type: RetrainingType) {
  return `/retraining/${RETRAINING_SEGMENT[type]}`;
}

export function retrainingHomePath(type: RetrainingType | null) {
  if (!type) return RETRAINING_SELECT_PATH;
  return retrainingBasePath(type);
}

export function parseRetrainingPath(pathname: string): RetrainingType | null {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("retraining");
  if (idx < 0) return null;
  return parseRetrainingSegment(parts[idx + 1]);
}

export function getStoredRetrainingType(_userId?: number | null): RetrainingType | null {
  return getTempRetrainingType();
}

export function setStoredRetrainingType(type: RetrainingType, _userId?: number | null) {
  setTempRetrainingType(type);
}

export function clearStoredRetrainingType(_userId?: number | null) {
  clearTempRetrainingType();
}

export function resolveRetrainingEntryPath(_userId?: number | null) {
  return retrainingHomePath(getStoredRetrainingType());
}

function withApplicationAlias(path: string) {
  return path.replace(/\/applications(?=\/|\?|$)/, "/application");
}

export function remapLegacyRetrainingPath(pathname: string, type: RetrainingType) {
  if (parseRetrainingPath(pathname)) return withApplicationAlias(pathname);
  const rest = pathname.replace(/^\/retraining\/?/, "");
  if (!rest || rest === "select-type") return retrainingHomePath(type);
  return withApplicationAlias(`${retrainingBasePath(type)}/${rest}`);
}
