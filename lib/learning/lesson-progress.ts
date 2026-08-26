import type {
  LearningCourseResponse,
  LearningLessonDetail,
  LearningLessonStatus,
  LearningLessonSummary,
  LearningModule,
} from "@/lib/api/types/learning";
import { formatLessonCode } from "@/lib/qualification/constants";

export type LessonProgressStatus = "locked" | "current" | "in_progress" | "completed" | "available";

function moduleLessons(module: LearningModule): LearningLessonSummary[] {
  return module.lessons ?? module.items ?? [];
}

export function flattenLearningLessons(modules: LearningModule[] = []) {
  return modules.flatMap(moduleLessons);
}

function normStatus(value?: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
}

/** Backend yoki mapper bergan statusni UI holatiga aylantiradi. */
export function resolveLessonProgressStatus(
  lesson: Pick<
    LearningLessonSummary,
    "status" | "is_locked" | "is_completed" | "is_current" | "locked" | "completed"
  >
): LessonProgressStatus {
  const raw = normStatus(lesson.status);
  if (raw === "in_progress" || raw === "inprogress") return "in_progress";
  // Faqat aniq yopiq bo'lsa locked — undefined/false ni yopiq deb hisoblamaymiz
  if (lesson.is_locked === true || lesson.locked === true || raw === "locked") return "locked";
  if (lesson.is_completed || lesson.completed || raw === "completed") return "completed";
  if (lesson.is_current || raw === "current") return "current";
  if (raw === "available" || raw === "open" || raw === "unlocked") return "available";
  // Status yo'q, lekin aniq yopilmagan → ochiq (ketma-ket unlock oldin qo'llangan bo'lishi mumkin)
  if (lesson.is_locked === false || lesson.locked === false) return "available";
  if (!raw) return "available";
  return "available";
}

export function canOpenLesson(status: LessonProgressStatus) {
  return status !== "locked";
}

export function lessonStatusLabel(status: LessonProgressStatus) {
  if (status === "completed") return "Tugatildi";
  if (status === "current") return "Hozirgi dars";
  if (status === "in_progress") return "Jarayonda";
  if (status === "locked") return "Yopiq";
  return "";
}

export function sortLearningModules(modules: LearningModule[]) {
  return [...modules].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

export function sortLearningLessons(lessons: LearningLessonSummary[]) {
  return [...lessons].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

/** Dars kodi: module.order + lesson.order (masalan dars.1.2). */
export function sidebarLessonCode(
  module: LearningModule,
  lesson: LearningLessonSummary,
  lessonIndex: number,
  moduleIndex: number
) {
  if (lesson.lesson_code?.trim()) {
    const code = lesson.lesson_code.trim();
    return code.startsWith("dars.") ? code : `dars.${code}`;
  }
  const moduleNo =
    module.order_index && module.order_index > 0 ? module.order_index : moduleIndex + 1;
  const lessonNo =
    lesson.order_index && lesson.order_index > 0 ? lesson.order_index : lessonIndex + 1;
  const formatted = formatLessonCode(moduleNo, lessonNo);
  return formatted ? `dars.${formatted}` : "";
}

export function computeProgressPercent(modules: LearningModule[]) {
  const lessons = flattenLearningLessons(modules);
  if (!lessons.length) return 0;
  const done = lessons.filter((item) => resolveLessonProgressStatus(item) === "completed").length;
  return Math.round((done / lessons.length) * 100);
}

/** Backend status bermasa, ketma-ket ochish qoidasini qo'llaydi. */
export function applySequentialUnlock(
  course: LearningCourseResponse,
  options: { inProgressId?: number | null; completedIds?: number[] } = {}
): LearningCourseResponse {
  const completed = new Set(options.completedIds ?? []);
  const inProgressId = options.inProgressId ?? null;
  let currentAssigned = false;

  const modules = sortLearningModules(course.modules ?? []).map((module, moduleIndex) => {
    const lessons = sortLearningLessons(moduleLessons(module).filter((item) => item.id)).map(
      (lesson, lessonIndex) => {
        const moduleNo = module.order_index && module.order_index > 0 ? module.order_index : moduleIndex + 1;
        const lessonNo =
          lesson.order_index && lesson.order_index > 0 ? lesson.order_index : lessonIndex + 1;
        const finished = completed.has(lesson.id) || resolveLessonProgressStatus(lesson) === "completed";
        const inProgress = inProgressId === lesson.id;
        const isCurrent = !finished && !inProgress && !currentAssigned;
        if (isCurrent) currentAssigned = true;

        let status: LearningLessonStatus;
        if (finished) status = "completed";
        else if (inProgress) status = "in_progress";
        else if (isCurrent) status = "current";
        else status = "available";

        return {
          ...lesson,
          order_index: lessonNo,
          lesson_code: lesson.lesson_code || formatLessonCode(moduleNo, lessonNo),
          status,
          status_label: lessonStatusLabel(status),
          is_completed: finished,
          is_current: status === "current",
          is_locked: false,
          completed: finished,
          locked: false,
        };
      }
    );
    return { ...module, order_index: module.order_index ?? moduleIndex + 1, lessons };
  });

  const progress =
    course.progress_percent != null && Number.isFinite(course.progress_percent)
      ? course.progress_percent
      : computeProgressPercent(modules);

  return { ...course, modules, progress_percent: progress };
}

export function hasBackendLessonStatuses(modules: LearningModule[]) {
  return flattenLearningLessons(modules).some((lesson) => {
    const raw = String(lesson.status ?? "").trim();
    if (raw) return true;
    if (lesson.is_completed || lesson.completed) return true;
    if (lesson.is_current) return true;
    // Faqat aniq locked=true — backend status bor deb hisoblanadi
    if (lesson.is_locked === true || lesson.locked === true) return true;
    return false;
  });
}

export function firstAccessibleLessonId(course: LearningCourseResponse) {
  const all = flattenLearningLessons(course.modules ?? []);
  const byCurrent = all.find((item) => item.id === course.current_lesson_id);
  if (byCurrent && canOpenLesson(resolveLessonProgressStatus(byCurrent))) return byCurrent.id;

  const current = all.find((item) => resolveLessonProgressStatus(item) === "current");
  if (current) return current.id;

  const inProgress = all.find((item) => resolveLessonProgressStatus(item) === "in_progress");
  if (inProgress) return inProgress.id;

  const completed = all.find((item) => resolveLessonProgressStatus(item) === "completed");
  if (completed) return completed.id;

  const available = all.find((item) => canOpenLesson(resolveLessonProgressStatus(item)));
  return available?.id ?? null;
}

export function lessonDetailFromTree(
  course: LearningCourseResponse,
  lessonId: number
): LearningLessonDetail | null {
  const rows = flattenLearningLessons(course.modules ?? []);
  const index = rows.findIndex((item) => item.id === lessonId);
  if (index < 0) return null;
  const listed = rows[index];
  const module = (course.modules ?? []).find((item) =>
    moduleLessons(item).some((lesson) => lesson.id === lessonId)
  );
  const prev = rows[index - 1];
  const next = rows[index + 1];
  const status = resolveLessonProgressStatus(listed);
  return {
    id: listed.id,
    module_id: module?.id,
    module_title: module?.title,
    title: listed.title,
    lesson_type: listed.lesson_type,
    item_type: listed.item_type,
    status: listed.status ?? status,
    status_label: listed.status_label ?? lessonStatusLabel(status),
    duration_label: listed.duration_label ?? "0 daqiqa",
    is_locked: status === "locked",
    is_completed: status === "completed",
    is_current: status === "current",
    materials: [],
    prev_lesson_id: prev?.id ?? null,
    next_lesson_id: next?.id ?? null,
  };
}

const MANDATORY_PROGRESS_PREFIX = "zm_mandatory_progress_";

export type MandatoryStoredProgress = {
  completedIds: number[];
  inProgressId: number | null;
};

export function readMandatoryProgress(blogId: number): MandatoryStoredProgress {
  if (typeof window === "undefined") return { completedIds: [], inProgressId: null };
  try {
    const raw = localStorage.getItem(`${MANDATORY_PROGRESS_PREFIX}${blogId}`);
    if (!raw) return { completedIds: [], inProgressId: null };
    const parsed = JSON.parse(raw) as MandatoryStoredProgress;
    return {
      completedIds: Array.isArray(parsed.completedIds)
        ? parsed.completedIds.filter((id) => Number.isFinite(id))
        : [],
      inProgressId: parsed.inProgressId ?? null,
    };
  } catch {
    return { completedIds: [], inProgressId: null };
  }
}

export function writeMandatoryProgress(blogId: number, progress: MandatoryStoredProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${MANDATORY_PROGRESS_PREFIX}${blogId}`, JSON.stringify(progress));
  } catch {
    /* quota */
  }
}
