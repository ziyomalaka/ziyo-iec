/**
 * Qayta tayyorlash tinglovchi API — Swagger tag `retraining`.
 * Malaka `/courses`, `/applications`, `/learning`, `/notifications` ga tegilmaydi.
 */
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { getCourse, getCourseFilters, getCourses } from "@/lib/api/courses";
import { mapApplication } from "@/lib/api/applications";
import {
  completeLearningLesson,
  enrollInCourse,
  getLearningCourse,
  getLearningLesson,
} from "@/lib/api/learning";
import { asList, asPaged, parsePositiveInt, unwrapApiPayload } from "@/lib/api/unwrap";
import { pickDirectionThumbnail } from "@/lib/qualification/direction-image";
import { COURSES_API_PREFIX, LEARNING_API_PREFIX } from "@/lib/api/student-api";
import type { CourseCardResponse, CourseListQuery } from "@/lib/api/types/courses";
import type { LearningCourseResponse } from "@/lib/api/types/learning";
import type {
  RetrainingCatalogCourse,
  RetrainingCatalogPage,
  RetrainingMyCourseItem,
  RetrainingOverview,
} from "@/lib/api/types/retraining";
import { mapCourseCard, mapCourseDetail } from "@/lib/dashboard/mappers/courses";
import { type StudentContinueState } from "@/lib/dashboard/continue-learning";
import { mapRemoteResult } from "@/lib/api/learning-progress";
import {
  courseQueryWithType,
  withRetrainingScope,
  type RetrainingApiScope,
} from "@/lib/api/retraining-query";
import type { RetrainingType } from "@/lib/retraining/kind";
import { filterByRetrainingType, requireStudentRetrainingType } from "@/lib/retraining/isolate";
import { hydrateRetrainingCatalogImages } from "@/lib/retraining/direction-images";

const COURSES = COURSES_API_PREFIX.retraining;
const LEARNING = LEARNING_API_PREFIX.retraining;
const RETRAINING_PER_PAGE = 8;

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function mapRetrainingMyCourseItem(data: unknown): RetrainingMyCourseItem | null {
  const row = asRecord(unwrapApiPayload(data));
  const courseId = parsePositiveInt(row.course_id) ?? parsePositiveInt(row.id);
  if (!courseId) return null;
  return {
    course_id: courseId,
    course_title: String(row.course_title ?? row.title ?? ""),
    subject: optionalString(row.subject),
    duration_hours: parsePositiveInt(row.duration_hours) ?? undefined,
    module_count: parsePositiveInt(row.module_count) ?? undefined,
    total_lessons: parsePositiveInt(row.total_lessons) ?? undefined,
    completed_lessons: parsePositiveInt(row.completed_lessons) ?? undefined,
    progress_percent: parsePositiveInt(row.progress_percent) ?? undefined,
    current_lesson_id: parsePositiveInt(row.current_lesson_id) ?? undefined,
    enrolled_at: optionalString(row.enrolled_at),
    enrollment_status: optionalString(row.enrollment_status),
    thumbnail_url: pickDirectionThumbnail(row),
    retraining_type: optionalString(row.retraining_type) ?? optionalString(row.retrainingType) ?? null,
  };
}

export function myCourseToLearningCourse(item: RetrainingMyCourseItem): LearningCourseResponse {
  return {
    id: item.course_id,
    course_id: item.course_id,
    title: item.course_title,
    enrolled: true,
    can_learn: true,
    progress_percent: item.progress_percent,
    current_lesson_id: item.current_lesson_id ?? null,
    modules: [],
  };
}

export function continueFromRetrainingMyCourse(
  item: RetrainingMyCourseItem,
  learningBase = "/retraining/learning"
): StudentContinueState {
  const lessonId = item.current_lesson_id;
  const href = lessonId ? `${learningBase}/${item.course_id}/lesson/${lessonId}` : `${learningBase}/${item.course_id}`;
  return {
    courseId: item.course_id,
    courseTitle: item.course_title,
    progressPercent: Math.max(0, Math.min(100, item.progress_percent ?? 0)),
    completedLessons: item.completed_lessons ?? 0,
    totalLessons: item.total_lessons ?? 0,
    moduleCount: item.module_count ?? 0,
    currentLessonId: lessonId ?? null,
    currentLessonTitle: "",
    href,
  };
}

function mapOverview(data: unknown): RetrainingOverview {
  const row = asRecord(unwrapApiPayload(data));
  return {
    program: optionalString(row.program),
    welcome: optionalString(row.welcome),
    message: optionalString(row.message),
    has_enrollment: row.has_enrollment === true,
    progress_percent: parsePositiveInt(row.progress_percent) ?? 0,
    current_lesson_id: parsePositiveInt(row.current_lesson_id) ?? undefined,
    unread_notifications: parsePositiveInt(row.unread_notifications) ?? 0,
    active_course: row.active_course ? mapRetrainingMyCourseItem(row.active_course) : null,
    last_result: row.last_result ?? null,
  };
}

export async function getRetrainingOverview(retrainingType?: RetrainingType | null): Promise<RetrainingOverview> {
  const type = requireStudentRetrainingType(retrainingType);
  return mapOverview(
    await apiRequest<unknown>(withRetrainingScope("/retraining/overview", { retrainingType: type }))
  );
}

function mapRetrainingCatalogItem(item: CourseCardResponse): RetrainingCatalogCourse {
  return {
    ...mapCourseCard(item),
    applicationId: item.application_id,
    applicationStatus: item.application_status,
    canApply: item.can_apply,
    cta: item.cta,
    rejectReason: item.reject_reason,
    retrainingType: item.retraining_type ?? item.kind ?? null,
  };
}

export async function getRetrainingCoursesPage(
  query: CourseListQuery = {},
  scope?: RetrainingApiScope
): Promise<RetrainingCatalogPage> {
  const type = requireStudentRetrainingType(scope?.retrainingType);
  const page = await getCourses(
    courseQueryWithType(
      {
        ...query,
        page: query.page ?? 1,
        per_page: query.per_page ?? RETRAINING_PER_PAGE,
      },
      { retrainingType: type }
    ) as CourseListQuery,
    false,
    COURSES
  );
  return {
    items: filterByRetrainingType(
      page.items.map(mapRetrainingCatalogItem),
      type,
      (item) => item.retrainingType
    ),
    page: page.page,
    per_page: page.per_page,
    total: page.total,
    total_pages: page.total_pages,
  };
}

export async function getRetrainingCoursesAll(
  query: CourseListQuery = {},
  scope?: RetrainingApiScope
): Promise<RetrainingCatalogCourse[]> {
  const type = requireStudentRetrainingType(scope?.retrainingType);
  const perPage = query.per_page ?? 100;
  const first = await getRetrainingCoursesPage({ ...query, page: 1, per_page: perPage }, scope);
  const items = [...first.items];
  const totalPages = Math.min(Math.max(1, first.total_pages || 1), 20);
  const rest: Promise<RetrainingCatalogPage>[] = [];
  for (let page = 2; page <= totalPages; page++) {
    rest.push(getRetrainingCoursesPage({ ...query, page, per_page: first.per_page || perPage }, scope));
  }
  const extraPages = await Promise.all(rest);
  for (const page of extraPages) items.push(...page.items);
  return hydrateRetrainingCatalogImages(items, type);
}

export async function getRetrainingCourseDetail(
  id: string | number,
  scope?: RetrainingApiScope
): Promise<RetrainingCatalogCourse | null> {
  try {
    const type = requireStudentRetrainingType(scope?.retrainingType);
    const typeQuery = courseQueryWithType({}, { retrainingType: type }) as Pick<CourseListQuery, "retraining_type">;
    const detail = await getCourse(id, true, COURSES, typeQuery);
    if (!detail.id) return null;
    const mapped = {
      ...mapCourseDetail(detail),
      applicationId: detail.application_id,
      applicationStatus: detail.application_status,
      canApply: detail.can_apply,
      cta: detail.cta,
      rejectReason: detail.reject_reason,
      retrainingType: detail.retraining_type ?? detail.kind ?? null,
    };
    if (!filterByRetrainingType([mapped], type, (item) => item.retrainingType).length) return null;
    return (await hydrateRetrainingCatalogImages([mapped], type))[0] ?? null;
  } catch {
    return null;
  }
}

export async function getRetrainingCourseFilters(scope?: RetrainingApiScope) {
  try {
    const type = requireStudentRetrainingType(scope?.retrainingType);
    const typeQuery = courseQueryWithType({}, { retrainingType: type }) as Pick<CourseListQuery, "retraining_type">;
    const filters = await getCourseFilters(false, COURSES, typeQuery);
    return {
      directions: filters.directions ?? [],
      subjects: filters.subjects ?? [],
      types: filters.course_types ?? [],
      hours: filters.hours ?? [],
      statuses: filters.statuses ?? [],
    };
  } catch {
    return { directions: [], subjects: [], types: [], hours: [], statuses: [] };
  }
}

export async function getRetrainingApplications(retrainingType?: RetrainingType | null) {
  if (!retrainingType) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  const type = requireStudentRetrainingType(retrainingType);
  const data = await apiRequest<unknown>(withRetrainingScope("/retraining/applications", { retrainingType: type }));
  return filterByRetrainingType(
    asList<unknown>(data, ["items", "applications"]).map(mapApplication).filter((item) => item.id),
    type,
    (item) => item.retraining_type ?? item.type
  );
}

export async function createRetrainingApplication(
  payload: { course_id: number; title: string },
  retrainingType?: RetrainingType | null
) {
  if (!retrainingType) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  const courseId = payload.course_id;
  const title = payload.title.trim();
  if (!courseId) {
    throw new ApiError(400, "Kurs tanlanishi shart.");
  }
  if (!title) {
    throw new ApiError(400, "Kurs nomi topilmadi.");
  }
  if (process.env.NODE_ENV === "development") {
    console.log("Create retraining application", {
      course_id: courseId,
      title,
    });
  }
  const type = requireStudentRetrainingType(retrainingType);
  const data = await apiRequest<unknown>(withRetrainingScope("/retraining/applications", { retrainingType: type }), {
    method: "POST",
    body: JSON.stringify({ course_id: courseId, title }),
  });
  return mapApplication(data);
}

export async function getRetrainingMyCourses(retrainingType?: RetrainingType | null): Promise<RetrainingMyCourseItem[]> {
  try {
    const type = requireStudentRetrainingType(retrainingType);
    const data = await apiRequest<unknown>(withRetrainingScope("/retraining/my-courses", { retrainingType: type }), {
      skipAuthRedirect: true,
    });
    const page = asPaged<unknown>(data);
    const items = page.items.length ? page.items : asList<unknown>(data, ["items", "courses"]);
    return filterByRetrainingType(
      items.map(mapRetrainingMyCourseItem).filter((item): item is RetrainingMyCourseItem => item !== null),
      type,
      (item) => item.retraining_type
    );
  } catch {
    return [];
  }
}

export async function getRetrainingLearningCourse(
  id: number,
  silentAuth = false,
  retrainingType?: RetrainingType | null
) {
  return getLearningCourse(id, silentAuth, LEARNING, retrainingType);
}

export async function enrollRetrainingCourse(id: number, retrainingType?: RetrainingType | null) {
  return enrollInCourse(id, LEARNING, retrainingType);
}

export async function getRetrainingLearningLesson(
  id: number,
  silentAuth = false,
  retrainingType?: RetrainingType | null
) {
  return getLearningLesson(id, silentAuth, LEARNING, retrainingType);
}

export async function completeRetrainingLearningLesson(
  id: number,
  silentAuth = false,
  retrainingType?: RetrainingType | null
) {
  return completeLearningLesson(id, silentAuth, LEARNING, retrainingType);
}

export function overviewContinueState(
  overview: RetrainingOverview,
  learningBase = "/retraining/learning"
): StudentContinueState | null {
  const active = overview.active_course;
  if (!active) return null;
  const withLesson = {
    ...active,
    current_lesson_id: overview.current_lesson_id ?? active.current_lesson_id,
    progress_percent: overview.progress_percent || active.progress_percent,
  };
  return continueFromRetrainingMyCourse(withLesson, learningBase);
}

export function overviewLastResult(overview: RetrainingOverview) {
  return overview.last_result ? mapRemoteResult(overview.last_result) : null;
}

export async function getRetrainingResults(page = 1, per_page = 100, retrainingType?: RetrainingType | null) {
  const type = requireStudentRetrainingType(retrainingType);
  return apiRequest<unknown>(
    withRetrainingScope(`/retraining/results?page=${page}&per_page=${per_page}`, { retrainingType: type }),
    { skipAuthRedirect: true }
  );
}

export async function getRetrainingAttempts(page = 1, per_page = 100, retrainingType?: RetrainingType | null) {
  const type = requireStudentRetrainingType(retrainingType);
  return apiRequest<unknown>(
    withRetrainingScope(`/retraining/attempts?page=${page}&per_page=${per_page}`, { retrainingType: type }),
    { skipAuthRedirect: true }
  );
}

export async function getRetrainingTestAttempts(page = 1, per_page = 100, retrainingType?: RetrainingType | null) {
  const type = requireStudentRetrainingType(retrainingType);
  return apiRequest<unknown>(
    withRetrainingScope(`/retraining/test-attempts?page=${page}&per_page=${per_page}`, { retrainingType: type }),
    { skipAuthRedirect: true }
  );
}
