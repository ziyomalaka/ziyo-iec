/**
 * Dars material progress + Natijalarim cache.
 *
 * Backendda material complete / results endpoint hali Swaggerda yo'q.
 * - Complete: POST /learning/lessons/{lessonId}/materials/{id}/complete uriniladi;
 *   404 bo'lsa local (user+lesson) saqlanadi — progress yo'qolmasin.
 * - Natijalar: submitdan keyin local tarix + GET /learning/results (agar chiqsa).
 */

import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import type { LessonTestData, LessonTestResult } from "@/lib/api/learning-test";
import { asList, parsePositiveInt, unwrapApiPayload } from "@/lib/api/unwrap";

function storageUserKey() {
  const user = typeof window !== "undefined" ? getAuthUser() : null;
  return user?.id != null ? String(user.id) : "anon";
}

function matProgressKey(lessonId: number) {
  return `zm_mat_progress_${storageUserKey()}_${lessonId}`;
}

function resultsKey() {
  return `zm_test_results_${storageUserKey()}`;
}

export type StoredTestResultRow = {
  id: string;
  lessonId: number;
  testId: number;
  testTitle?: string;
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  attempt?: number;
  percentage?: number;
  score?: number;
  passed: boolean;
  mastery_status?: string;
  restudy_required?: boolean;
  date: string;
};

export function readMaterialProgress(lessonId: number): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(matProgressKey(lessonId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { completed?: unknown };
    return Array.isArray(parsed.completed)
      ? parsed.completed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeMaterialProgress(lessonId: number, completed: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      matProgressKey(lessonId),
      JSON.stringify({ completed: [...new Set(completed)], updatedAt: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

/**
 * Materialni tugatish.
 * Backend endpoint mavjud bo'lsa — chaqiriladi; yo'q bo'lsa local saqlanadi.
 */
export async function completeLessonMaterial(
  lessonId: number,
  opts: { key: string; materialId?: number }
): Promise<{ ok: true; via: "api" | "local" }> {
  const current = readMaterialProgress(lessonId);
  const next = [...new Set([...current, opts.key])];
  writeMaterialProgress(lessonId, next);

  if (opts.materialId && getAuthToken()) {
    try {
      await apiRequest(`/learning/lessons/${lessonId}/materials/${opts.materialId}/complete`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      return { ok: true, via: "api" };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
        return { ok: true, via: "local" };
      }
      // Boshqa xato — local saqlangan; UI davom etadi
      return { ok: true, via: "local" };
    }
  }

  return { ok: true, via: "local" };
}

export function appendLocalTestResult(row: Omit<StoredTestResultRow, "id" | "date"> & { id?: string; date?: string }) {
  if (typeof window === "undefined") return;
  const item: StoredTestResultRow = {
    id: row.id ?? `${row.testId}-${row.attempt ?? 0}-${Date.now()}`,
    date: row.date ?? new Date().toISOString(),
    lessonId: row.lessonId,
    testId: row.testId,
    testTitle: row.testTitle,
    courseTitle: row.courseTitle,
    moduleTitle: row.moduleTitle,
    lessonTitle: row.lessonTitle,
    attempt: row.attempt,
    percentage: row.percentage,
    score: row.score,
    passed: row.passed,
    mastery_status: row.mastery_status,
    restudy_required: row.restudy_required,
  };
  try {
    const prev = readLocalTestResults();
    const next = [item, ...prev.filter((r) => r.id !== item.id)].slice(0, 200);
    localStorage.setItem(resultsKey(), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readLocalTestResults(): StoredTestResultRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(resultsKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as StoredTestResultRow[]) : [];
  } catch {
    return [];
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function mapRemoteResult(item: unknown): StoredTestResultRow | null {
  const row = asRecord(item);
  const testId =
    parsePositiveInt(row.test_id) ??
    parsePositiveInt(row.testId) ??
    parsePositiveInt(asRecord(row.test).id);
  const lessonId =
    parsePositiveInt(row.lesson_id) ??
    parsePositiveInt(row.lessonId) ??
    parsePositiveInt(asRecord(row.lesson).id) ??
    0;
  if (!testId) return null;
  const passed =
    row.passed === true ||
    row.is_passed === true ||
    String(row.status ?? "").toLowerCase() === "passed" ||
    String(row.status ?? "").toLowerCase() === "success";
  return {
    id: String(row.id ?? `${testId}-${row.attempt ?? row.attempt_number ?? ""}`),
    lessonId,
    testId,
    testTitle:
      (typeof row.test_title === "string" && row.test_title) ||
      (typeof row.title === "string" && row.title) ||
      (typeof asRecord(row.test).title === "string" ? String(asRecord(row.test).title) : undefined),
    courseTitle:
      (typeof row.course_title === "string" && row.course_title) ||
      (typeof row.course === "string" && row.course) ||
      undefined,
    moduleTitle: typeof row.module_title === "string" ? row.module_title : undefined,
    lessonTitle: typeof row.lesson_title === "string" ? row.lesson_title : undefined,
    attempt: parsePositiveInt(row.attempt) ?? parsePositiveInt(row.attempt_number) ?? undefined,
    percentage: parsePositiveInt(row.percentage) ?? parsePositiveInt(row.percent) ?? undefined,
    score: parsePositiveInt(row.score) ?? undefined,
    passed,
    mastery_status: typeof row.mastery_status === "string" ? row.mastery_status : undefined,
    date:
      (typeof row.created_at === "string" && row.created_at) ||
      (typeof row.completed_at === "string" && row.completed_at) ||
      (typeof row.date === "string" && row.date) ||
      new Date().toISOString(),
  };
}

/** Natijalarim — backend bo'lsa undan, aks holda local submit tarixi */
export async function fetchMyTestResults(): Promise<{
  items: StoredTestResultRow[];
  source: "api" | "local";
}> {
  const local = readLocalTestResults();
  const paths = [
    "/learning/results",
    "/learning/test-attempts",
    "/learning/attempts",
    "/profile/test-results",
  ];

  for (const path of paths) {
    try {
      const data = await apiRequest<unknown>(path, { skipAuthRedirect: true });
      const list = asList<unknown>(unwrapApiPayload(data), ["items", "results", "attempts", "data"]);
      const mapped = list.map(mapRemoteResult).filter((r): r is StoredTestResultRow => r !== null);
      if (mapped.length || Array.isArray(unwrapApiPayload(data))) {
        // API + local merge (API ustun)
        const byId = new Map<string, StoredTestResultRow>();
        for (const row of local) byId.set(row.id, row);
        for (const row of mapped) byId.set(row.id, row);
        return {
          items: [...byId.values()].sort((a, b) => b.date.localeCompare(a.date)),
          source: "api",
        };
      }
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 405)) continue;
      break;
    }
  }

  return { items: local, source: "local" };
}

export function recordSubmitForResults(opts: {
  lessonId: number;
  testId: number;
  testTitle?: string;
  courseTitle?: string;
  moduleTitle?: string;
  lessonTitle?: string;
  result: LessonTestResult;
}) {
  appendLocalTestResult({
    lessonId: opts.lessonId,
    testId: opts.testId,
    testTitle: opts.testTitle,
    courseTitle: opts.courseTitle,
    moduleTitle: opts.moduleTitle,
    lessonTitle: opts.lessonTitle,
    attempt: opts.result.attempt,
    percentage: opts.result.percentage ?? opts.result.score,
    score: opts.result.score,
    passed: opts.result.passed,
    mastery_status: opts.result.mastery_status,
    restudy_required: opts.result.restudy_required,
  });
}

export type PersistedLessonTestAttempt = {
  lessonId: number;
  testId: number;
  test: LessonTestData | null;
  result: LessonTestResult;
  answers: Record<number, number>;
  savedAt: string;
};

function lessonTestAttemptKey(lessonId: number) {
  return `zm_lesson_test_attempt_${storageUserKey()}_${lessonId}`;
}

function asAnswerMap(raw: unknown): Record<number, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<number, number> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const questionId = Number(key);
    const answerId = typeof value === "number" ? value : Number(value);
    if (Number.isInteger(questionId) && questionId > 0 && Number.isInteger(answerId) && answerId > 0) {
      out[questionId] = answerId;
    }
  }
  return out;
}

/** Natija saqlangach — yangilash / qayta kirishda test oynasi ochilmasin. */
export function saveLessonTestAttempt(data: PersistedLessonTestAttempt) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      lessonTestAttemptKey(data.lessonId),
      JSON.stringify({
        ...data,
        savedAt: data.savedAt || new Date().toISOString(),
      })
    );
  } catch {
    /* ignore */
  }
}

export function readLessonTestAttempt(lessonId: number): PersistedLessonTestAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lessonTestAttemptKey(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLessonTestAttempt;
    if (!parsed || parsed.lessonId !== lessonId || !parsed.result) return null;
    return {
      lessonId,
      testId: Number(parsed.testId) || 0,
      test: parsed.test && typeof parsed.test === "object" ? parsed.test : null,
      result: parsed.result,
      answers: asAnswerMap(parsed.answers),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : "",
    };
  } catch {
    return null;
  }
}
