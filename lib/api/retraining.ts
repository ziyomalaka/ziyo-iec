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
import { COURSES_API_PREFIX, LEARNING_API_PREFIX } from "@/lib/api/student-api";
import type { CreateApplicationRequest } from "@/lib/api/types/applications";
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
    thumbnail_url: optionalString(row.thumbnail_url),
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

export async function getRetrainingOverview(): Promise<RetrainingOverview> {
  return mapOverview(await apiRequest<unknown>("/retraining/overview"));
}

function mapRetrainingCatalogItem(item: CourseCardResponse): RetrainingCatalogCourse {
  return {
    ...mapCourseCard(item),
    applicationId: item.application_id,
    applicationStatus: item.application_status,
    canApply: item.can_apply,
    cta: item.cta,
    rejectReason: item.reject_reason,
  };
}

export async function getRetrainingCoursesPage(query: CourseListQuery = {}): Promise<RetrainingCatalogPage> {
  const page = await getCourses(
    {
      ...query,
      page: query.page ?? 1,
      per_page: query.per_page ?? RETRAINING_PER_PAGE,
    },
    false,
    COURSES
  );
  return {
    items: page.items.map(mapRetrainingCatalogItem),
    page: page.page,
    per_page: page.per_page,
    total: page.total,
    total_pages: page.total_pages,
  };
}

export async function getRetrainingCoursesAll(query: CourseListQuery = {}): Promise<RetrainingCatalogCourse[]> {
  const perPage = query.per_page ?? 100;
  const first = await getRetrainingCoursesPage({ ...query, page: 1, per_page: perPage });
  const items = [...first.items];
  const totalPages = Math.min(Math.max(1, first.total_pages || 1), 20);
  for (let page = 2; page <= totalPages; page++) {
    const next = await getRetrainingCoursesPage({ ...query, page, per_page: first.per_page || perPage });
    items.push(...next.items);
  }
  return items;
}

export async function getRetrainingCourseDetail(id: string | number): Promise<RetrainingCatalogCourse | null> {
  try {
    const detail = await getCourse(id, true, COURSES);
    if (!detail.id) return null;
    return {
      ...mapCourseDetail(detail),
      applicationId: detail.application_id,
      applicationStatus: detail.application_status,
      canApply: detail.can_apply,
      cta: detail.cta,
      rejectReason: detail.reject_reason,
    };
  } catch {
    return null;
  }
}

export async function getRetrainingCourseFilters() {
  try {
    const filters = await getCourseFilters(false, COURSES);
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

export async function getRetrainingApplications() {
  const data = await apiRequest<unknown>("/retraining/applications");
  return asList<unknown>(data, ["items", "applications"]).map(mapApplication).filter((item) => item.id);
}

export async function createRetrainingApplication(payload: CreateApplicationRequest) {
  if (!payload.course_id) {
    throw new ApiError(400, "Kurs tanlanishi shart.");
  }
  const data = await apiRequest<unknown>("/retraining/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapApplication(data);
}

export async function getRetrainingMyCourses(): Promise<RetrainingMyCourseItem[]> {
  try {
    const data = await apiRequest<unknown>("/retraining/my-courses", { skipAuthRedirect: true });
    const page = asPaged<unknown>(data);
    const items = page.items.length ? page.items : asList<unknown>(data, ["items", "courses"]);
    return items.map(mapRetrainingMyCourseItem).filter((item): item is RetrainingMyCourseItem => item !== null);
  } catch {
    return [];
  }
}

export async function getRetrainingLearningCourse(id: number, silentAuth = false) {
  return getLearningCourse(id, silentAuth, LEARNING);
}

export async function enrollRetrainingCourse(id: number) {
  return enrollInCourse(id, LEARNING);
}

export async function getRetrainingLearningLesson(id: number, silentAuth = false) {
  return getLearningLesson(id, silentAuth, LEARNING);
}

export async function completeRetrainingLearningLesson(id: number, silentAuth = false) {
  return completeLearningLesson(id, silentAuth, LEARNING);
}

export function overviewContinueState(overview: RetrainingOverview): StudentContinueState | null {
  const active = overview.active_course;
  if (!active) return null;
  const withLesson = {
    ...active,
    current_lesson_id: overview.current_lesson_id ?? active.current_lesson_id,
    progress_percent: overview.progress_percent || active.progress_percent,
  };
  return continueFromRetrainingMyCourse(withLesson);
}

export function overviewLastResult(overview: RetrainingOverview) {
  return overview.last_result ? mapRemoteResult(overview.last_result) : null;
}

export async function getRetrainingResults(page = 1, per_page = 100) {
  return apiRequest<unknown>(`/retraining/results?page=${page}&per_page=${per_page}`, {
    skipAuthRedirect: true,
  });
}

export async function getRetrainingAttempts(page = 1, per_page = 100) {
  return apiRequest<unknown>(`/retraining/attempts?page=${page}&per_page=${per_page}`, {
    skipAuthRedirect: true,
  });
}

export async function getRetrainingTestAttempts(page = 1, per_page = 100) {
  return apiRequest<unknown>(`/retraining/test-attempts?page=${page}&per_page=${per_page}`, {
    skipAuthRedirect: true,
  });
}
