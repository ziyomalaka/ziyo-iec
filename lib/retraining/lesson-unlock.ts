import type { LearningCourseResponse, LearningLessonSummary, LearningModule } from "@/lib/api/types/learning";
import { getAuthUser } from "@/lib/auth/session";
import { flattenTreeLessons, buildRetrainingLearningTree, treeLessonStatus } from "@/lib/retraining/learning-tree";

export const RETRAINING_UNLOCK_INTERVAL_MS = 23 * 60 * 60 * 1000;
export const RETRAINING_UNLOCK_BATCH = 3;
export const RETRAINING_UNLOCK_LOCKED_MESSAGE = "Keyingi dars hali ochilmagan.";

const STORAGE_PREFIX = "zm_retraining_lesson_unlock";

export type RetrainingUnlockState = {
  startedAt: number;
  unlockedCount: number;
  remainingMs: number;
  countdown: string;
  allOpen: boolean;
};

function storageKey(courseId: number) {
  const userId = getAuthUser()?.id ?? "anon";
  return `${STORAGE_PREFIX}:${userId}:${courseId}`;
}

function readStartedAt(courseId: number): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(courseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { startedAt?: unknown };
    const startedAt = Number(parsed.startedAt);
    return Number.isFinite(startedAt) && startedAt > 0 ? startedAt : null;
  } catch {
    return null;
  }
}

function writeStartedAt(courseId: number, startedAt: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(courseId), JSON.stringify({ startedAt }));
  } catch {
    /* quota */
  }
}

/** Birinchi kirishda yoziladi; refresh qayta yozmaydi. */
export function ensureRetrainingUnlockStarted(courseId: number): number {
  if (typeof window === "undefined" || !(courseId > 0)) return 0;
  const existing = readStartedAt(courseId);
  if (existing) return existing;
  const startedAt = Date.now();
  writeStartedAt(courseId, startedAt);
  return startedAt;
}

export function formatUnlockCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

export function computeRetrainingUnlock(
  startedAt: number,
  now: number,
  totalLessons = Number.POSITIVE_INFINITY
): RetrainingUnlockState {
  const safeStart = startedAt > 0 ? startedAt : now;
  const elapsed = Math.max(0, now - safeStart);
  const batchesElapsed = Math.floor(elapsed / RETRAINING_UNLOCK_INTERVAL_MS);
  const unlockedCount = Math.min(
    Number.isFinite(totalLessons) ? totalLessons : Number.POSITIVE_INFINITY,
    (batchesElapsed + 1) * RETRAINING_UNLOCK_BATCH
  );
  const allOpen = Number.isFinite(totalLessons) && unlockedCount >= totalLessons;
  const nextAt = safeStart + (batchesElapsed + 1) * RETRAINING_UNLOCK_INTERVAL_MS;
  const remainingMs = allOpen ? 0 : Math.max(0, nextAt - now);
  return {
    startedAt: safeStart,
    unlockedCount,
    remainingMs,
    countdown: formatUnlockCountdown(remainingMs),
    allOpen,
  };
}

function patchLesson(
  lesson: LearningLessonSummary,
  index: number,
  unlockedCount: number,
  currentAssigned: { value: boolean }
): LearningLessonSummary {
  if (treeLessonStatus(lesson) === "completed") {
    return {
      ...lesson,
      status: "completed",
      is_completed: true,
      completed: true,
      is_locked: false,
      locked: false,
      is_current: false,
    };
  }
  if (index < unlockedCount) {
    const status = currentAssigned.value ? "available" : "current";
    currentAssigned.value = true;
    return {
      ...lesson,
      status,
      is_locked: false,
      locked: false,
      is_current: status === "current",
      is_completed: false,
      completed: false,
    };
  }
  return {
    ...lesson,
    status: "locked",
    is_locked: true,
    locked: true,
    is_current: false,
  };
}

function patchModule(
  module: LearningModule,
  byId: Map<number, LearningLessonSummary>
): LearningModule {
  const mapLessons = (lessons?: LearningLessonSummary[]) =>
    lessons?.map((item) => byId.get(item.id) ?? item);
  return {
    ...module,
    lessons: mapLessons(module.lessons) ?? module.lessons,
    items: module.items ? mapLessons(module.items) : module.items,
  };
}

/** Frontend 23 soat / 3 dars oynasi. Backend statusni o'zgartirmaydi. */
export function overlayRetrainingUnlockWindow(
  course: LearningCourseResponse,
  unlockedCount: number
): LearningCourseResponse {
  const ordered = flattenTreeLessons(buildRetrainingLearningTree(course));
  const currentAssigned = { value: false };
  const byId = new Map<number, LearningLessonSummary>();
  ordered.forEach((lesson, index) => {
    byId.set(lesson.id, patchLesson(lesson, index, unlockedCount, currentAssigned));
  });
  return {
    ...course,
    modules: (course.modules ?? []).map((module) => patchModule(module, byId)),
  };
}
