import { getAuthUser } from "@/lib/auth/session";
import {
  PROGRAM_TYPES,
  RETRAINING_TYPES,
  type ProgramType,
  type RetrainingType,
} from "@/lib/validations/register";

// TEMPORARY FRONTEND STATE
// Replace with backend user profile when Retraining API is connected.

export const TEMP_PROGRAM_TYPE_KEY = "ziyo_program_type";
export const TEMP_RETRAINING_TYPE_KEY = "ziyo_retraining_type";

export function isRetrainingApiEnabled() {
  return process.env.NEXT_PUBLIC_RETRAINING_API_ENABLED !== "false";
}

function readKey(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, value);
}

function asProgramType(value?: string | null): ProgramType | null {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return PROGRAM_TYPES.includes(key as ProgramType) ? (key as ProgramType) : null;
}

function asRetrainingType(value?: string | null): RetrainingType | null {
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  return RETRAINING_TYPES.includes(key as RetrainingType) ? (key as RetrainingType) : null;
}

export function getTempProgramType(): ProgramType | null {
  return asProgramType(readKey(TEMP_PROGRAM_TYPE_KEY));
}

export function setTempProgramType(program: ProgramType) {
  writeKey(TEMP_PROGRAM_TYPE_KEY, program);
}

export function getTempRetrainingType(): RetrainingType | null {
  return asRetrainingType(readKey(TEMP_RETRAINING_TYPE_KEY));
}

export function setTempRetrainingType(type: RetrainingType) {
  writeKey(TEMP_RETRAINING_TYPE_KEY, type);
  writeKey(TEMP_PROGRAM_TYPE_KEY, "QAYTA_TAYYORLASH");
}

export function clearTempRetrainingType() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TEMP_RETRAINING_TYPE_KEY);
}

/** Sync guard source: temp storage first, then session user. Does not call the backend. */
export function resolveFrontendProgram(): ProgramType | null {
  return getTempProgramType() ?? asProgramType(getAuthUser()?.program_type);
}

export function resolveFrontendRetrainingType(): RetrainingType | null {
  return getTempRetrainingType();
}
