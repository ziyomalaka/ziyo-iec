import type { CourseDetailResponse, CourseLessonSummary } from "@/lib/api/types/courses";
import type {
  LearningCourseResponse,
  LearningLessonSummary,
  LearningModule,
} from "@/lib/api/types/learning";
import { overlayLearningCourseKinds } from "@/lib/learning/lesson-kind";
import {
  applySequentialUnlock,
  flattenLearningLessons,
  hasBackendLessonStatuses,
  sortLearningLessons,
  sortLearningModules,
} from "@/lib/learning/lesson-progress";
import { formatLessonCode } from "@/lib/qualification/constants";
import { isVisibleToStudent } from "@/lib/publish-status";

function moduleLessons(module: LearningModule): LearningLessonSummary[] {
  return module.lessons ?? module.items ?? [];
}

function lessonKey(title?: string) {
  return (title ?? "").trim().toLowerCase();
}

function catalogLessonAllowList(catalog?: CourseDetailResponse | null) {
  const modules = catalog?.modules ?? [];
  const ids = new Set<number>();
  const titles = new Set<string>();
  let count = 0;
  for (const module of modules) {
    for (const lesson of module.lessons ?? []) {
      if (!lesson.id || !isVisibleToStudent(lesson.status)) continue;
      ids.add(lesson.id);
      if (lesson.title) titles.add(lessonKey(lesson.title));
      count += 1;
    }
  }
  return { ids, titles, count };
}

/** Learning API ba'zan o'chirilgan darsni qaytaradi — katalog (admin daraxti) asos. */
export function filterLearningToCatalog(
  course: LearningCourseResponse,
  catalog?: CourseDetailResponse | null
): LearningCourseResponse {
  if (!catalog) return course;
  const allow = catalogLessonAllowList(catalog);
  if (!allow.count) return { ...course, modules: [] };
  const modules = (course.modules ?? [])
    .map((module) => ({
      ...module,
      lessons: moduleLessons(module).filter(
        (lesson) =>
          Boolean(lesson.id) &&
          isVisibleToStudent(lesson.status) &&
          (allow.ids.has(lesson.id) || allow.titles.has(lessonKey(lesson.title)))
      ),
    }))
    .filter((module) => isVisibleToStudent(module.status) && moduleLessons(module).length > 0);
  return { ...course, modules };
}

function catalogLessonToSummary(
  lesson: CourseLessonSummary,
  moduleOrder: number,
  lessonOrder: number
): LearningLessonSummary {
  return {
    id: lesson.id,
    title: lesson.title,
    lesson_type: lesson.lesson_type,
    item_type: lesson.item_type,
    status: lesson.status,
    order_index: lessonOrder,
    lesson_code: formatLessonCode(moduleOrder, lessonOrder),
    duration_label: lesson.duration_minutes != null ? `${lesson.duration_minutes} daqiqa` : undefined,
  };
}

export function ensureLearningTree(course: LearningCourseResponse): LearningCourseResponse {
  const modules = sortLearningModules(course.modules ?? []).map((module, moduleIndex) => {
    const moduleOrder = module.order_index && module.order_index > 0 ? module.order_index : moduleIndex + 1;
    const lessons = sortLearningLessons(
      moduleLessons(module).filter((item) => item.id && isVisibleToStudent(item.status))
    );
    return {
      ...module,
      order_index: moduleOrder,
      lessons: lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        order_index: lesson.order_index ?? lessonIndex + 1,
        lesson_code:
          lesson.lesson_code ||
          formatLessonCode(moduleOrder, lesson.order_index ?? lessonIndex + 1),
      })),
    };
  }).filter((module) => isVisibleToStudent(module.status) && module.lessons.length > 0);
  return { ...course, modules };
}

/** Learning API + katalog metadata; status backenddan, bo'lmasa ketma-ket ochish. */
export function mergeLearningWithCatalog(
  learning: LearningCourseResponse,
  catalog?: CourseDetailResponse | null,
  sequential?: { completedIds?: number[]; inProgressId?: number | null }
): LearningCourseResponse {
  const hasCatalog = catalog != null;
  const catalogModules = catalog?.modules ?? [];
  const learningModules = learning.modules ?? [];

  const byId = new Map(catalogModules.map((item) => [item.id, item]));
  const byTitle = new Map(catalogModules.map((item) => [item.title.trim().toLowerCase(), item]));

  const sourceModules = learningModules.length
    ? learningModules
    : catalogModules.map((item) => ({
        id: item.id,
        title: item.title,
        order_index: item.order_index,
        lessons: [] as LearningLessonSummary[],
      }));

  const modules = sortLearningModules(
    sourceModules.map((module, moduleIndex) => {
      const moduleOrder = module.order_index && module.order_index > 0 ? module.order_index : moduleIndex + 1;
      const existing = sortLearningLessons(
        moduleLessons(module).filter((item) => item.id && isVisibleToStudent(item.status))
      );
      const catalogModule = byId.get(module.id) ?? byTitle.get(module.title.trim().toLowerCase());
      const catalogLessons = (catalogModule?.lessons ?? []).filter((item) => isVisibleToStudent(item.status));
      const allowedIds = new Set(catalogLessons.map((item) => item.id));
      const allowedTitles = new Set(catalogLessons.map((item) => item.title.trim().toLowerCase()));
      const visibleExisting = hasCatalog
        ? existing.filter(
            (lesson) => allowedIds.has(lesson.id) || allowedTitles.has(lesson.title.trim().toLowerCase())
          )
        : existing;
      if (visibleExisting.length) {
        return {
          ...module,
          order_index: moduleOrder,
          lessons: visibleExisting.map((lesson, lessonIndex) => ({
            ...lesson,
            order_index: lesson.order_index ?? lessonIndex + 1,
            lesson_code:
              lesson.lesson_code ||
              formatLessonCode(moduleOrder, lesson.order_index ?? lessonIndex + 1),
          })),
        };
      }
      if (!catalogLessons.length) {
        return { ...module, order_index: moduleOrder, lessons: hasCatalog ? [] : existing };
      }

      const lessons = catalogLessons.map((lesson, lessonIndex) =>
        catalogLessonToSummary(lesson, moduleOrder, lessonIndex + 1)
      );
      return {
        ...module,
        order_index: moduleOrder,
        title: module.title || catalogModule?.title || "",
        lessons,
      };
    })
  );

  let merged = ensureLearningTree(
    overlayLearningCourseKinds(
      {
        ...learning,
        title: learning.title || catalog?.title || "",
        modules,
      },
      catalog
    )
  );

  if (!hasBackendLessonStatuses(merged.modules ?? []) && sequential) {
    merged = applySequentialUnlock(merged, sequential);
  } else if (!hasBackendLessonStatuses(merged.modules ?? [])) {
    merged = applySequentialUnlock(merged);
  }

  return filterLearningToCatalog(merged, catalog);
}

export { firstAccessibleLessonId as firstOpenLessonId } from "@/lib/learning/lesson-progress";
export { lessonDetailFromTree as lessonDetailFromCourse } from "@/lib/learning/lesson-progress";
export { flattenLearningLessons } from "@/lib/learning/lesson-progress";
