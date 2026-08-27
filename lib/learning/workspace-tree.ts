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
import { isLessonListedForStudent, isModuleListedForStudent } from "@/lib/publish-status";

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
      if (!lesson.id || !isLessonListedForStudent(lesson.status)) continue;
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
  if (!allow.count) {
    return catalog ? { ...course, modules: [] } : course;
  }
  const modules = (course.modules ?? [])
    .map((module) => ({
      ...module,
      lessons: moduleLessons(module).filter(
        (lesson) =>
          Boolean(lesson.id) &&
          isLessonListedForStudent(lesson.status) &&
          (allow.ids.has(lesson.id) || allow.titles.has(lessonKey(lesson.title)))
      ),
    }))
    .filter((module) => isModuleListedForStudent(module.status));
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
    materials: (lesson.materials ?? []).map((item, index) => ({
      id: item.id ?? index + 1,
      type: item.material_type,
      material_type: item.material_type,
      title: item.title,
      url: item.url,
      file_url: item.file_url,
      file: item.file,
      content_text: item.content_text,
    })),
  };
}

export function ensureLearningTree(course: LearningCourseResponse): LearningCourseResponse {
  const modules = sortLearningModules(course.modules ?? []).map((module, moduleIndex) => {
    const moduleOrder = module.order_index && module.order_index > 0 ? module.order_index : moduleIndex + 1;
    const lessons = sortLearningLessons(
      moduleLessons(module).filter((item) => item.id && isLessonListedForStudent(item.status))
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
  }).filter((module) => isModuleListedForStudent(module.status));
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

  const sourceModules = hasCatalog
    ? catalogModules.map((item) => {
        const fromLearning = learningModules.find(
          (row) =>
            row.id === item.id ||
            row.title.trim().toLowerCase() === item.title.trim().toLowerCase()
        );
        const fromLearningLessons = fromLearning ? moduleLessons(fromLearning) : [];
        return {
          id: item.id,
          title: item.title,
          order_index: item.order_index ?? fromLearning?.order_index,
          status: item.status,
          lessons: fromLearningLessons.length ? fromLearningLessons : ([] as LearningLessonSummary[]),
        };
      })
    : learningModules;

  const modules = sortLearningModules(
    sourceModules.map((module, moduleIndex) => {
      const moduleOrder = module.order_index && module.order_index > 0 ? module.order_index : moduleIndex + 1;
      const existing = sortLearningLessons(
        moduleLessons(module).filter((item) => item.id && isLessonListedForStudent(item.status))
      );
      const catalogModule = byId.get(module.id) ?? byTitle.get(module.title.trim().toLowerCase());
      const catalogLessons = (catalogModule?.lessons ?? []).filter((item) => isLessonListedForStudent(item.status));
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
