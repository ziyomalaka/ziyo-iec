import { getMyApplications } from "@/lib/api/applications";
import { getLearningCourse, getMyLearningCourses } from "@/lib/api/learning";
import type { LearningCourseResponse } from "@/lib/api/types/learning";
import { isApprovedApplicationStatus, isMandatoryBlockCourse } from "@/lib/dashboard/course-application";
import { resolveLessonProgressStatus } from "@/lib/learning/lesson-progress";
import { firstOpenLessonId, flattenLearningLessons } from "@/lib/learning/workspace-tree";

export type StudentContinueState = {
  courseId: number;
  courseTitle: string;
  progressPercent: number;
  completedLessons: number;
  totalLessons: number;
  moduleCount: number;
  currentLessonId: number | null;
  currentLessonTitle: string;
  href: string;
};

export function lessonProgressOf(course: LearningCourseResponse) {
  const lessons = flattenLearningLessons(course.modules ?? []);
  const totalLessons = lessons.length;
  const completedLessons = lessons.filter(
    (item) => resolveLessonProgressStatus(item) === "completed"
  ).length;
  const backend = course.progress_percent;
  const progressPercent =
    backend != null && Number.isFinite(Number(backend))
      ? Math.max(0, Math.min(100, Math.round(Number(backend))))
      : totalLessons
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0;
  return { lessons, totalLessons, completedLessons, progressPercent };
}

export function continueFromCourse(course: LearningCourseResponse): StudentContinueState {
  const { lessons, totalLessons, completedLessons, progressPercent } = lessonProgressOf(course);
  const currentId = firstOpenLessonId(course);
  const current =
    lessons.find((item) => item.id === currentId) ??
    lessons.find((item) => item.id === course.current_lesson_id) ??
    null;
  const href = current?.id
    ? `/dashboard/learning/${course.id}/lesson/${current.id}`
    : `/dashboard/learning/${course.id}`;
  return {
    courseId: course.id,
    courseTitle: course.title,
    progressPercent,
    completedLessons,
    totalLessons,
    moduleCount: course.modules?.length ?? 0,
    currentLessonId: current?.id ?? currentId,
    currentLessonTitle: current?.title ?? "",
    href,
  };
}

async function withModules(course: LearningCourseResponse) {
  if (course.modules?.length) return course;
  return getLearningCourse(course.id, true).catch(() => course);
}

export async function loadStudentContinueState(): Promise<StudentContinueState | null> {
  const enrolled = (await getMyLearningCourses(true)).filter(
    (item) => !isMandatoryBlockCourse({ title: item.title })
  );
  let course: LearningCourseResponse | null =
    enrolled.find((item) => (item.modules?.length ?? 0) > 0) ?? enrolled[0] ?? null;
  if (course) course = await withModules(course);

  if (!course) {
    const apps = await getMyApplications().catch(() => []);
    const approved = apps.find((item) => isApprovedApplicationStatus(item.status) && item.course_id);
    if (approved?.course_id) {
      course = await getLearningCourse(approved.course_id, true).catch(() => null);
    }
  }

  if (!course) return null;
  return continueFromCourse(course);
}
