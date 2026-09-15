import { ApiError } from "@/lib/api/errors";
import { getAuthUser } from "@/lib/auth/session";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { StoredTestResultRow } from "@/lib/api/learning-progress";
import type { CourseListQuery } from "@/lib/api/types/courses";
import type { RetrainingCatalogCourse, RetrainingMyCourseItem, RetrainingOverview } from "@/lib/api/types/retraining";
import type { Notification } from "@/lib/dashboard/types";
import { courseApplicationTitle } from "@/lib/dashboard/course-application";
import type { RetrainingType } from "@/lib/retraining/kind";
import { normalizeRetrainingType } from "@/lib/retraining/kind";
import {
  DEMO_RETRAINING_COURSES,
  demoLearningOutline,
} from "@/lib/retraining/mocks";
import {
  readLocalApplications,
  readLocalMyCourses,
  readLocalNotifications,
  readLocalResults,
  writeLocalApplications,
  writeLocalMyCourses,
  writeLocalNotifications,
} from "@/lib/retraining/local-store";
import { isRetrainingApiEnabled } from "@/lib/retraining/temp-state";
import type { RetrainingApplicant, RetrainingLearningOutline, RetrainingLesson } from "@/lib/retraining/types";
import { applyToRetrainingCourse, getRetrainingApplications } from "@/lib/retraining/applications";
import { getRetrainingCourse, getRetrainingCourses } from "@/lib/retraining/catalog";
import {
  continueFromRetrainingMyCourse,
  getRetrainingLearningCourse,
  getRetrainingMyCourses,
  getRetrainingOverview,
} from "@/lib/api/retraining";
import { fetchMyTestResults } from "@/lib/api/learning-progress";
import type { LearningCourseResponse, LearningLessonSummary } from "@/lib/api/types/learning";
import { parsePositiveInt } from "@/lib/api/unwrap";

function profileRetrainingType(): RetrainingType | null {
  return normalizeRetrainingType(getAuthUser()?.retraining_type);
}

function currentType(type?: RetrainingType | null): RetrainingType | null {
  return normalizeRetrainingType(type) ?? profileRetrainingType();
}

function requireCurrentType(type?: RetrainingType | null): RetrainingType {
  const kind = currentType(type);
  if (!kind) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  return kind;
}

function resolvedType(type?: RetrainingType | null): RetrainingType {
  return requireCurrentType(type);
}

export function getRetrainingApplicant(): RetrainingApplicant {
  const user = getAuthUser();
  return {
    fullName: [user?.last_name, user?.first_name, user?.father_name].filter(Boolean).join(" "),
    phone: user?.phone_number || "",
    email: user?.email || "",
    region: "",
    education: "",
    specialty: "",
    workplace: "",
    position: "",
  };
}

export async function retrainingListCourses(type?: RetrainingType | null, query: CourseListQuery = {}) {
  const kind = requireCurrentType(type);
  if (isRetrainingApiEnabled()) return getRetrainingCourses(query, kind);
  return DEMO_RETRAINING_COURSES[kind].map((course) => {
    const application = readLocalApplications(kind).find((item) => String(item.course_id) === course.id);
    if (!application) return course;
    return {
      ...course,
      applicationId: application.id,
      applicationStatus: application.status,
      cta: application.status === "pending" ? "pending" : course.cta,
      canApply: application.status !== "pending",
    };
  });
}

export async function retrainingGetCourse(id: string, type?: RetrainingType | null) {
  const kind = requireCurrentType(type);
  if (isRetrainingApiEnabled()) return getRetrainingCourse(id, kind);
  const items = await retrainingListCourses(kind);
  return items.find((item) => item.id === id) ?? null;
}

export async function retrainingListApplications(type?: RetrainingType | null) {
  if (isRetrainingApiEnabled()) {
    const kind = requireCurrentType(type);
    return getRetrainingApplications(kind);
  }
  return readLocalApplications(currentType(type) ?? "UMUMIY");
}

export async function retrainingSubmitApplication(
  course: { id: string; title: string },
  notes?: string,
  type?: RetrainingType | null
) {
  const kind = resolvedType(type);
  if (isRetrainingApiEnabled()) return applyToRetrainingCourse(course, notes, kind);

  // TEMPORARY FRONTEND STATE
  // Replace with backend user profile when Retraining API is connected.
  const created: ClientApplicationResponse = {
    id: Date.now(),
    title: courseApplicationTitle(course.title),
    type: kind,
    status: "pending",
    status_label: "Ko‘rib chiqilmoqda",
    comment: notes.trim() || undefined,
    course_id: Number(course.id) || undefined,
    created_at: new Date().toISOString(),
  };
  const next = [created, ...readLocalApplications(kind).filter((item) => item.course_id !== created.course_id)];
  writeLocalApplications(kind, next);

  const notifications = readLocalNotifications(kind);
  writeLocalNotifications(kind, [
    {
      id: `app-${created.id}`,
      title: "Ariza saqlandi",
      text: `${course.title} uchun ariza frontendda saqlandi.`,
      date: new Date().toISOString().slice(0, 10),
      read: false,
      category: "courses",
      fromAdmin: false,
    },
    ...notifications,
  ]);

  return created;
}

export async function retrainingListMyCourses(type?: RetrainingType | null) {
  const kind = resolvedType(type);
  if (isRetrainingApiEnabled()) return getRetrainingMyCourses(kind);
  return readLocalMyCourses(kind);
}

export async function retrainingSaveMyCourses(items: RetrainingMyCourseItem[], type?: RetrainingType | null) {
  writeLocalMyCourses(resolvedType(type), items);
}

export async function retrainingGetOverview(type?: RetrainingType | null): Promise<RetrainingOverview> {
  const kind = resolvedType(type);
  if (isRetrainingApiEnabled()) return getRetrainingOverview(kind);
  const active = readLocalMyCourses(kind)[0] ?? null;
  return {
    program: kind,
    welcome: "",
    message: "",
    has_enrollment: Boolean(active),
    progress_percent: active?.progress_percent ?? 0,
    current_lesson_id: active?.current_lesson_id,
    unread_notifications: readLocalNotifications(kind).filter((item) => !item.read).length,
    active_course: active,
    last_result: readLocalResults(kind)[0] ?? null,
  };
}

export async function retrainingListResults(type?: RetrainingType | null): Promise<StoredTestResultRow[]> {
  const kind = resolvedType(type);
  if (isRetrainingApiEnabled()) {
    const remote = await fetchMyTestResults("retraining", kind);
    return remote.items;
  }
  return readLocalResults(kind);
}

export async function retrainingListNotifications(type?: RetrainingType | null): Promise<Notification[]> {
  const kind = resolvedType(type);
  if (isRetrainingApiEnabled()) return [];
  return readLocalNotifications(kind);
}

export async function retrainingMarkNotificationRead(id: string, type?: RetrainingType | null) {
  const kind = resolvedType(type);
  writeLocalNotifications(
    kind,
    readLocalNotifications(kind).map((item) => (item.id === id ? { ...item, read: true } : item))
  );
}

export async function retrainingMarkAllNotificationsRead(type?: RetrainingType | null) {
  const kind = resolvedType(type);
  writeLocalNotifications(
    kind,
    readLocalNotifications(kind).map((item) => ({ ...item, read: true }))
  );
}

export async function retrainingRemoveNotification(id: string, type?: RetrainingType | null) {
  const kind = resolvedType(type);
  writeLocalNotifications(
    kind,
    readLocalNotifications(kind).filter((item) => item.id !== id)
  );
}

export async function retrainingRemoveAllNotifications(type?: RetrainingType | null) {
  writeLocalNotifications(resolvedType(type), []);
}

function mapLessonStatus(lesson: LearningLessonSummary): RetrainingLesson["status"] {
  if (lesson.is_completed || lesson.completed || lesson.status === "completed") return "completed";
  if (lesson.is_current || lesson.status === "current" || lesson.status === "in_progress") return "current";
  if (lesson.is_locked || lesson.locked || lesson.status === "locked") return "locked";
  return "available";
}

function mapLearningCourseToOutline(course: LearningCourseResponse): RetrainingLearningOutline {
  return {
    courseId: String(course.course_id ?? course.id),
    courseTitle: course.title,
    modules: (course.modules ?? []).map((module) => ({
      id: String(module.id),
      title: module.title,
      lessons: (module.lessons ?? module.items ?? []).map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title,
        kind:
          lesson.item_type === "test" || (lesson.test_count ?? 0) > 0 || lesson.title.toLowerCase().includes("test")
            ? "test"
            : "material",
        status: mapLessonStatus(lesson),
      })),
    })),
  };
}

export async function retrainingGetLearning(
  type?: RetrainingType | null,
  courseId?: string
): Promise<RetrainingLearningOutline | null> {
  const kind = resolvedType(type);
  if (!isRetrainingApiEnabled()) return demoLearningOutline(kind, courseId);

  const id = parsePositiveInt(courseId);
  if (!id) return null;

  try {
    const course = await getRetrainingLearningCourse(id, true, kind);
    if (!course.modules?.length) return null;
    return mapLearningCourseToOutline(course);
  } catch {
    return null;
  }
}

export function retrainingContinueHref(item: RetrainingMyCourseItem, learningBase: string) {
  return continueFromRetrainingMyCourse(item, learningBase).href;
}

export { type RetrainingCatalogCourse };
