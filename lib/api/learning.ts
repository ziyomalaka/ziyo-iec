import { pickFileUrl } from "@/lib/api/media";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { isLearnForbiddenError, withLearningAccessRetry } from "@/lib/api/learning-access";
import { parsePositiveInt, unwrapApiPayload, asList } from "@/lib/api/unwrap";
import { lessonKindFromDescription, mapStoredLessonKind, stripLessonKindMarker } from "@/lib/learning/lesson-kind";
import { isLessonListedForStudent, isModuleListedForStudent, isRemovedLessonRecord, isVisibleToStudent } from "@/lib/publish-status";
import type {
  LearningAssignment,
  LearningCourseResponse,
  LearningLessonDetail,
  LearningLessonStatus,
  LearningLessonSummary,
  LearningMaterial,
  LearningModule,
} from "@/lib/api/types/learning";

export { isLearnForbiddenError, withLearningAccessRetry } from "@/lib/api/learning-access";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Lesson response dagi tests[] ni LearningMaterial[] ga aylantiradi.
 * asMaterials dan farqi: ID ni to'g'ridan-to'g'ri row.id dan oladi, type ni "test" deb belgilaydi.
 * Bu GET /learning/lessons/{id} → tests[] dan test ID ni yo'qotmaslik uchun.
 */
function extractTestMaterials(value: unknown): LearningMaterial[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = asRecord(item);
      if (!isVisibleToStudent(optionalString(row.status))) return null;
      // test_id yoki id — ikkalasini ham tekshiramiz
      const id =
        parsePositiveInt(row.id) ??
        parsePositiveInt(row.test_id) ??
        parsePositiveInt(row.testId);
      if (!id) return null;
      return {
        id,
        type: "test",
        material_type: "test",
        title: optionalString(row.title) ?? optionalString(row.name),
      } satisfies LearningMaterial;
    })
    .filter((m): m is LearningMaterial => m !== null);
}

function asMaterials(value: unknown): LearningMaterial[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    const row = asRecord(item);
    if (!isVisibleToStudent(optionalString(row.status))) return [];
    const type = optionalString(row.material_type) ?? optionalString(row.type);
    // file_url ni birinchi o'qiymiz — backend bergan pathni /uploads ga aylantirmaymiz
    const fileUrl =
      optionalString(row.file_url) ??
      optionalString(row.url) ??
      optionalString(row.video_url) ??
      pickFileUrl(row);
    const file = asRecord(row.file);
    const storagePath = optionalString(file.storage_path) ?? optionalString(row.storage_path);
    return [{
      id: parsePositiveInt(row.id) ?? index + 1,
      type,
      material_type: type,
      title: optionalString(row.title),
      url: fileUrl || undefined,
      file_url: fileUrl || undefined,
      content_url: optionalString(row.content_url),
      storage_path: storagePath,
      mime_type: optionalString(row.mime_type) ?? optionalString(file.mime_type),
      original_name: optionalString(row.original_name) ?? optionalString(file.original_name),
      file: fileUrl || storagePath ? { url: fileUrl || undefined, storage_path: storagePath } : undefined,
      content_text: optionalString(row.content_text) ?? optionalString(row.description),
    }];
  });
}

function asAssignments(value: unknown): LearningAssignment[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row = asRecord(item);
    return {
      id: parsePositiveInt(row.id) ?? index + 1,
      title: optionalString(row.title),
      description: optionalString(row.description),
      file_url: pickFileUrl(row) || optionalString(row.file_url),
      deadline: optionalString(row.deadline),
      deadline_label: optionalString(row.deadline_label),
    };
  });
}

function asLessonList(value: unknown): LearningLessonSummary[] {
  if (!Array.isArray(value)) return [];
  const lessons: LearningLessonSummary[] = [];
  for (const item of value) {
    const row = asRecord(item);
    const id = parsePositiveInt(row.id);
    if (!id) continue;
    if (!isLessonListedForStudent(optionalString(row.status))) continue;
    if (isRemovedLessonRecord(row)) continue;
    const order =
      Number(row.order_index) ||
      Number(row.order) ||
      Number(row.lesson_number) ||
      Number(row.sort_order);
    const lessonType =
      mapStoredLessonKind(optionalString(row.lesson_type)) ??
      mapStoredLessonKind(optionalString(row.lesson_type_label)) ??
      lessonKindFromDescription(optionalString(row.description)) ??
      optionalString(row.lesson_type);
    const itemType = optionalString(row.item_type);
    // Backend bermasa undefined qoldiramiz — Boolean(undefined)=false bo'lib barcha darslar "locked" bo'lib qolmasin
    const lockedRaw = row.is_locked ?? row.locked;
    const completedRaw = row.is_completed ?? row.completed;
    const locked = lockedRaw === undefined || lockedRaw === null ? undefined : Boolean(lockedRaw);
    const completed = completedRaw === undefined || completedRaw === null ? undefined : Boolean(completedRaw);
    const testCount =
      parsePositiveInt(row.test_count) ??
      (Array.isArray(row.tests) ? row.tests.length : undefined);
    const hasTestsFlag =
      row.has_tests === true ||
      row.has_tests === 1 ||
      row.has_tests === "true" ||
      row.has_test === true ||
      (typeof testCount === "number" && testCount > 0) ||
      (Array.isArray(row.tests) && row.tests.length > 0);
    lessons.push({
      id,
      title: String(row.title ?? ""),
      // item_type ni "test" ga majburlamaymiz — testlar tests[] / has_tests da
      item_type: itemType,
      item_type_label: optionalString(row.item_type_label),
      lesson_type: lessonType,
      lesson_type_label: optionalString(row.lesson_type_label),
      status: optionalString(row.status),
      status_label: optionalString(row.status_label),
      is_locked: locked,
      is_completed: completed,
      is_current: row.is_current === undefined || row.is_current === null ? undefined : Boolean(row.is_current),
      locked,
      completed,
      test_count: testCount,
      has_tests: hasTestsFlag || undefined,
      duration_label: optionalString(row.duration_label),
      order_index: Number.isFinite(order) && order > 0 ? order : undefined,
      lesson_code: optionalString(row.lesson_code),
    });
  }
  return lessons.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

export function lessonUiStatus(lesson: Pick<LearningLessonSummary, "status" | "is_locked" | "is_completed" | "is_current" | "locked" | "completed">): LearningLessonStatus {
  const raw = String(lesson.status ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_");
  if (raw === "in_progress" || raw === "inprogress") return "in_progress";
  if (lesson.is_locked === true || lesson.locked === true || raw === "locked") return "locked";
  if (lesson.is_completed || lesson.completed || raw === "completed") return "completed";
  if (lesson.is_current || raw === "current") return "current";
  if (raw === "available" || raw === "open" || raw === "unlocked") return "available";
  if (lesson.is_locked === false || lesson.locked === false) return "available";
  return "available";
}

export function normalizeLearningCourse(data: unknown): LearningCourseResponse {
  const root = asRecord(unwrapApiPayload(data));
  const course = asRecord(root.course && typeof root.course === "object" ? { ...root, ...asRecord(root.course) } : root);
  const rawModules = Array.isArray(course.modules)
    ? course.modules
    : Array.isArray(root.modules)
      ? root.modules
      : [];

  const modules = rawModules
    .map((item) => {
      const row = asRecord(item);
      if (!isModuleListedForStudent(optionalString(row.status))) return null;
      const order =
        Number(row.order_index) ||
        Number(row.order) ||
        Number(row.module_number) ||
        Number(row.sort_order);
      return {
        id: parsePositiveInt(row.id) ?? 0,
        title: String(row.title ?? ""),
        order_index: Number.isFinite(order) && order > 0 ? order : undefined,
        status: optionalString(row.status),
        lessons: asLessonList(row.lessons ?? row.items ?? row.topics ?? row.children),
      } satisfies LearningModule;
    })
    .filter((item): item is LearningModule => Boolean(item && item.id))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const progress = Number(course.progress_percent);
  const courseId = parsePositiveInt(course.course_id) ?? parsePositiveInt(course.id) ?? 0;
  const lessonHasTests = modules.some((m) =>
    (m.lessons ?? []).some((l) => l.has_tests === true)
  );

  return {
    id: courseId,
    course_id: courseId,
    title: String(course.course_title ?? course.title ?? ""),
    description: optionalString(course.description),
    enrolled: course.enrolled === true,
    can_learn: courseCanLearn(course),
    application_status: optionalString(course.application_status),
    access_message: optionalString(course.access_message),
    progress_percent: Number.isFinite(progress) ? progress : undefined,
    current_lesson_id: parsePositiveInt(course.current_lesson_id),
    has_tests:
      course.has_tests === true ||
      course.has_tests === 1 ||
      course.has_tests === "true" ||
      lessonHasTests ||
      undefined,
    modules,
  };
}

export function normalizeLearningLesson(data: unknown): LearningLessonDetail {
  const root = asRecord(unwrapApiPayload(data));
  const lesson = asRecord(root.lesson && typeof root.lesson === "object" ? { ...root, ...asRecord(root.lesson) } : root);
  const minutes = Number(lesson.duration_minutes);
  const lockedRaw = lesson.is_locked ?? lesson.locked;
  const completedRaw = lesson.is_completed ?? lesson.completed;
  const locked = lockedRaw === undefined || lockedRaw === null ? undefined : Boolean(lockedRaw);
  const completed = completedRaw === undefined || completedRaw === null ? undefined : Boolean(completedRaw);

  const tests = extractTestMaterials(lesson.tests ?? root.tests);
  const materialsOnly = asMaterials(lesson.materials ?? lesson.lesson_materials ?? root.materials);
  const testCount =
    parsePositiveInt(lesson.test_count) ??
    parsePositiveInt(root.test_count) ??
    (tests.length || undefined);

  return {
    id: parsePositiveInt(lesson.id) ?? 0,
    course_id: parsePositiveInt(lesson.course_id) ?? undefined,
    module_id: parsePositiveInt(lesson.module_id) ?? undefined,
    module_title: optionalString(lesson.module_title),
    title: String(lesson.title ?? ""),
    about: optionalString(lesson.about),
    description: stripLessonKindMarker(optionalString(lesson.description)) || undefined,
    teacher_name: optionalString(lesson.teacher_name),
    duration_minutes: Number.isFinite(minutes) ? minutes : undefined,
    duration_label:
      optionalString(lesson.duration_label) ??
      (Number.isFinite(minutes) ? `${minutes} daqiqa` : undefined),
    video_url: optionalString(lesson.video_url),
    file_url: optionalString(lesson.file_url) || pickFileUrl(lesson) || undefined,
    content_url: optionalString(lesson.content_url),
    content_text: optionalString(lesson.content_text),
    lesson_type:
      mapStoredLessonKind(optionalString(lesson.lesson_type)) ??
      mapStoredLessonKind(optionalString(lesson.lesson_type_label)) ??
      lessonKindFromDescription(optionalString(lesson.description) ?? optionalString(lesson.content_text)) ??
      optionalString(lesson.lesson_type),
    // item_type="test" ni majburlamaymiz — testlar tests[] da
    item_type: optionalString(lesson.item_type),
    status: optionalString(lesson.status),
    status_label: optionalString(lesson.status_label),
    is_locked: locked,
    is_completed: completed,
    is_current: lesson.is_current === undefined || lesson.is_current === null ? undefined : Boolean(lesson.is_current),
    locked,
    completed,
    materials: [
      ...materialsOnly,
      // tests[] ni materials ga ham qo'shamiz — LessonTest tests[0].id ni topadi
      ...tests,
    ],
    tests,
    test_count: testCount,
    has_tests:
      tests.length > 0 ||
      (typeof testCount === "number" && testCount > 0) ||
      lesson.has_tests === true ||
      lesson.has_tests === 1 ||
      lesson.has_tests === "true" ||
      undefined,
    assignments: asAssignments(lesson.assignments),
    prev_lesson_id: parsePositiveInt(lesson.prev_lesson_id ?? lesson.previous_lesson_id),
    next_lesson_id: parsePositiveInt(lesson.next_lesson_id),
  };
}

function isTruthyFlag(value: unknown) {
  return value === true || value === "true" || value === 1 || value === "1";
}

function isFalseyFlag(value: unknown) {
  return value === false || value === "false" || value === 0 || value === "0";
}

/** Swagger `LearningCourseResponse` da `can_learn` yo'q — `enrolled` / ariza holati / modullar ham yetarli. */
export function courseCanLearn(course: Record<string, unknown> | LearningCourseResponse) {
  const row = course as Record<string, unknown>;
  if (isFalseyFlag(row.can_learn) || isFalseyFlag(row.canLearn)) return false;
  if (isTruthyFlag(row.can_learn) || isTruthyFlag(row.canLearn)) return true;
  const status = String(row.application_status ?? "").toLowerCase();
  if (status === "approved" || status === "accepted") return true;
  if (isTruthyFlag(row.enrolled)) return true;
  // Kurs tarkibi kelgan — backend aniq yopmagan, ochiq deb qabul qilamiz
  const modules = row.modules;
  if (Array.isArray(modules) && modules.length > 0) return true;
  return false;
}

export function materialHref(item: LearningMaterial) {
  return pickFileUrl(item);
}

function isVideoType(value?: string) {
  const type = String(value || "").toLowerCase();
  return type === "video" || type.endsWith("_video") || type.includes("video");
}

function isVideoPath(path?: string) {
  return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i.test(path ?? "");
}

export function lessonVideoUrl(lesson: LearningLessonDetail) {
  if (lesson.video_url?.trim()) return lesson.video_url.trim();
  const materials = lesson.materials ?? [];
  const video = materials.find((item) => isVideoType(item.material_type) || isVideoType(item.type));
  if (video) return pickFileUrl(video);
  const byExt = materials.find((item) => isVideoPath(pickFileUrl(item)));
  if (byExt) return pickFileUrl(byExt);
  const fallback = [lesson.file_url, lesson.content_url].find((value) => typeof value === "string" && value.trim());
  if (
    fallback &&
    (isVideoPath(fallback) || isVideoType(lesson.item_type) || isVideoType(lesson.lesson_type))
  ) {
    return fallback.trim();
  }
  return "";
}

export function isAlreadyEnrolledError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status === 409) return true;
  const msg = error.message.toLowerCase();
  return msg.includes("already") || msg.includes("enrolled") || msg.includes("yozilgan");
}

const CACHE_TTL_MS = 30_000;
const courseCache = new Map<number, { at: number; data: LearningCourseResponse }>();
const lessonCache = new Map<number, { at: number; data: LearningLessonDetail }>();

function readCache<T>(map: Map<number, { at: number; data: T }>, id: number) {
  const hit = map.get(id);
  if (!hit || Date.now() - hit.at > CACHE_TTL_MS) return null;
  return hit.data;
}

function writeCache<T>(map: Map<number, { at: number; data: T }>, id: number, data: T) {
  map.set(id, { at: Date.now(), data });
}

export function invalidateLearningCache(courseId?: number, lessonId?: number) {
  if (courseId != null) courseCache.delete(courseId);
  if (lessonId != null) lessonCache.delete(lessonId);
}

export async function enrollInCourse(id: number) {
  return apiRequest<unknown>(`/learning/courses/${id}/enroll`, { method: "POST" });
}

/** GET /learning/courses — yozilgan kurslar (yo'q bo'lsa bo'sh). */
export async function getMyLearningCourses(silentAuth = true): Promise<LearningCourseResponse[]> {
  try {
    const data = await apiRequest<unknown>("/learning/courses", silentAuth ? { skipAuthRedirect: true } : {});
    return asList<unknown>(data, ["items", "courses"])
      .map((row) => normalizeLearningCourse(row))
      .filter((item) => item.id > 0);
  } catch {
    return [];
  }
}

export async function getLearningCourse(id: number, silentAuth = false) {
  if (!silentAuth) {
    const cached = readCache(courseCache, id);
    if (cached) return cached;
  }
  const data = await withLearningAccessRetry(() =>
    apiRequest<unknown>(`/learning/courses/${id}`, silentAuth ? { skipAuthRedirect: true } : {})
  );
  const normalized = normalizeLearningCourse(data);
  if (!silentAuth) writeCache(courseCache, id, normalized);
  return normalized;
}

export async function getLearningLesson(id: number, silentAuth = false) {
  if (!silentAuth) {
    const cached = readCache(lessonCache, id);
    if (cached) {
      console.log("STUDENT LESSON CACHE HIT lessonId:", id, {
        testsCount: cached.tests?.length ?? 0,
        has_tests: cached.has_tests,
        materialTestIds: (cached.materials ?? [])
          .filter((m) => m.type === "test" || m.material_type === "test")
          .map((m) => m.id),
      });
      return cached;
    }
  }
  const requestUrl = `/learning/lessons/${id}`;
  console.log("STUDENT CURRENT LESSON fetch lessonId:", id);
  console.log("TEST FETCH lessonId:", id);
  console.log("TEST FETCH URL:", requestUrl);

  const data = await withLearningAccessRetry(() =>
    apiRequest<unknown>(requestUrl, silentAuth ? { skipAuthRedirect: true } : {})
  );
  const root = asRecord(unwrapApiPayload(data));
  const rawTests = root.tests ?? asRecord(root.lesson).tests;
  console.log("STUDENT LESSON raw tests[]:", rawTests);
  console.log("STUDENT LESSON raw id fields:", {
    id: root.id ?? asRecord(root.lesson).id,
    lesson_id: root.lesson_id ?? asRecord(root.lesson).lesson_id,
  });

  const normalized = normalizeLearningLesson(data);
  if (!isLessonListedForStudent(normalized.status)) {
    throw new ApiError(404, "Dars topilmadi");
  }
  console.log("STUDENT CURRENT LESSON:", {
    id: normalized.id,
    title: normalized.title,
    has_tests: normalized.has_tests,
    tests: normalized.tests,
  });
  console.log("STUDENT lessonId:", normalized.id);

  // Swagger fallback: lesson.tests[] bo'sh bo'lsa → GET /learning/lessons/{id}/tests
  let lesson = normalized;
  if (!(lesson.tests?.length)) {
    try {
      const { fetchLessonTestSummaries } = await import("@/lib/api/learning-test");
      const summaries = await fetchLessonTestSummaries(id);
      if (summaries.length) {
        const testMaterials = summaries.map((t) => ({
          id: t.id,
          type: "test" as const,
          material_type: "test",
          title: t.title,
        }));
        const existingIds = new Set((lesson.materials ?? []).map((m) => m.id));
        lesson = {
          ...lesson,
          tests: testMaterials,
          has_tests: true,
          materials: [
            ...(lesson.materials ?? []),
            ...testMaterials.filter((t) => !existingIds.has(t.id)),
          ],
        };
        console.log("STUDENT LESSON tests from /tests:", summaries.map((t) => t.id));
      }
    } catch (err) {
      // 403/401 — yutib "test yo'q" deb ko'rsatmaymiz; LessonTest o'zi xabar beradi
      const status = (err as { status?: number })?.status;
      console.log("STUDENT LESSON /tests fallback skipped:", { lessonId: id, status });
    }
  }

  const adminSaved =
    typeof window !== "undefined" ? window.sessionStorage.getItem("zm_diag_admin_test_lesson_id") : null;
  const adminTestId =
    typeof window !== "undefined" ? window.sessionStorage.getItem("zm_diag_admin_test_id") : null;
  console.table({
    adminSavedLessonId: adminSaved ?? "(shu brauzerda test saqlanmagan)",
    studentCurrentLessonId: lesson.id,
    testRequestLessonId: id,
    match: adminSaved ? String(adminSaved) === String(lesson.id) : "N/A",
    adminTestId: adminTestId ?? "—",
    testsFromApi: lesson.tests?.length ?? 0,
  });

  if (!silentAuth) writeCache(lessonCache, id, lesson);
  return lesson;
}

export async function completeLearningLesson(id: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`/learning/lessons/${id}/complete`, {
    method: "POST",
    ...(silentAuth ? { skipAuthRedirect: true } : {}),
  });
  if (!silentAuth) {
    lessonCache.delete(id);
    courseCache.clear();
  }
  const root = asRecord(unwrapApiPayload(data));
  return {
    nextLessonId: parsePositiveInt(root.next_lesson_id) ?? parsePositiveInt(root.nextLessonId),
    raw: data,
  };
}
