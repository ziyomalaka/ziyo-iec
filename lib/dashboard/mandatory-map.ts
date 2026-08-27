import type { QualificationDirection, QualificationLesson, QualificationMaterial } from "@/lib/api/types/qualification";
import type { LearningCourseResponse, LearningLessonDetail, LearningMaterial } from "@/lib/api/types/learning";
import type { MyDirection, UpcomingLesson } from "@/lib/dashboard/types";
import {
  MANDATORY_BLOCK_TITLE,
  mandatoryLearningHref,
} from "@/lib/dashboard/course-application";
import {
  applySequentialUnlock,
  type MandatoryStoredProgress,
} from "@/lib/learning/lesson-progress";
import { formatLessonCode } from "@/lib/qualification/constants";
import { filterPublishedContentTrees, isVisibleToStudent, isRemovedLessonRecord, isRemovedModuleRecord } from "@/lib/publish-status";

function languageLabel(value?: string) {
  const raw = value?.trim().toLowerCase() ?? "";
  if (!raw || raw === "uz" || raw === "uzb" || raw === "o'zbek" || raw === "ozbek") return "O'zbek tili";
  if (raw === "ru" || raw === "rus" || raw === "russian") return "Русский";
  return value?.trim() || "O'zbek tili";
}

export { isVisibleToStudent as isPublishedForStudent } from "@/lib/publish-status";

function materialUrl(item: QualificationMaterial) {
  return item.url || item.file_url || item.file?.url || "";
}

export function mapMandatoryMaterials(items: QualificationMaterial[] = []): LearningMaterial[] {
  return items
    .filter((item) => isVisibleToStudent(item.status))
    .map((item, index) => {
      const type = item.type;
      const url = materialUrl(item);
      return {
        id: item.id || index + 1,
        type,
        material_type: type,
        title: item.title,
        url: url || undefined,
        file_url: url || undefined,
        storage_path: item.file?.storage_path,
        file: url || item.file?.storage_path ? { url: url || undefined, storage_path: item.file?.storage_path } : undefined,
      };
    });
}

export function publishedMandatoryBlogs(items: QualificationDirection[]) {
  return filterPublishedContentTrees(items);
}

export function flattenMandatoryLessons(blog: QualificationDirection) {
  const rows: { module: NonNullable<QualificationDirection["modules"]>[number]; lesson: QualificationLesson; index: number }[] = [];
  if (!isVisibleToStudent(blog.status)) return rows;
  const modules = [...(blog.modules ?? [])].sort(
    (a, b) => (a.module_number ?? 0) - (b.module_number ?? 0)
  );

  for (const module of modules) {
    if (isRemovedModuleRecord(module as unknown as Record<string, unknown>)) continue;
    if (!isVisibleToStudent(module.status)) continue;

    const lessons = [...(module.lessons ?? [])]
      .filter((lesson) => {
        if (!lesson.id) return false;
        if (isRemovedLessonRecord(lesson as unknown as Record<string, unknown>)) return false;
        return isVisibleToStudent(lesson.status);
      })
      .sort((a, b) => (a.lesson_number ?? 0) - (b.lesson_number ?? 0));
    for (const lesson of lessons) {
      rows.push({ module, lesson, index: rows.length });
    }
  }
  return rows;
}

function mandatoryBaseCourse(blog: QualificationDirection): LearningCourseResponse {
  const flat = flattenMandatoryLessons(blog);
  const byModule = new Map<number, typeof flat>();
  for (const row of flat) {
    const list = byModule.get(row.module.id) ?? [];
    list.push(row);
    byModule.set(row.module.id, list);
  }

  const modules = [...(blog.modules ?? [])]
    .filter((module) => {
      if (isRemovedModuleRecord(module as unknown as Record<string, unknown>)) return false;
      return isVisibleToStudent(module.status);
    })
    .sort((a, b) => (a.module_number ?? 0) - (b.module_number ?? 0))
    .map((module, moduleIndex) => {
      const moduleOrder = module.module_number ?? moduleIndex + 1;
      const source = byModule.get(module.id) ?? [];
      const lessons = source.map((row) => {
        const lesson = row.lesson;
        const lessonOrder = lesson.lesson_number ?? row.index + 1;
        const hasTests =
          (lesson.materials ?? []).some((item) => String(item.type).toUpperCase() === "TEST") ||
          (Array.isArray((lesson as { tests?: unknown[] }).tests) &&
            ((lesson as { tests?: unknown[] }).tests?.length ?? 0) > 0);
        return {
          id: lesson.id,
          title: lesson.title,
          lesson_type: lesson.lesson_type || "THEORY",
          order_index: lessonOrder,
          lesson_code: lesson.lesson_code || formatLessonCode(moduleOrder, lessonOrder),
          item_type: "lesson" as const,
          has_tests: hasTests || undefined,
        };
      });

      return {
        id: module.id,
        title: module.title,
        order_index: moduleOrder,
        lessons,
      };
    })
    .filter((module) => module.lessons.length > 0);

  return {
    id: blog.id,
    title: blog.title?.trim() || MANDATORY_BLOCK_TITLE,
    description: blog.description,
    enrolled: true,
    can_learn: true,
    modules,
  };
}

export function mapMandatoryBlogToLearning(
  blog: QualificationDirection,
  progress: MandatoryStoredProgress = { completedIds: [], inProgressId: null }
): LearningCourseResponse {
  return applySequentialUnlock(mandatoryBaseCourse(blog), {
    completedIds: progress.completedIds,
    inProgressId: progress.inProgressId,
  });
}

export function mapMandatoryLessonDetail(blog: QualificationDirection, lessonId: number): LearningLessonDetail | null {
  const rows = flattenMandatoryLessons(blog);
  const current = rows.find((row) => row.lesson.id === lessonId);
  if (!current) return null;

  const materials = mapMandatoryMaterials(current.lesson.materials);
  const video = materials.find((item) => String(item.type || item.material_type).toUpperCase() === "VIDEO");
  const hasTests = materials.some((item) => String(item.type || item.material_type).toUpperCase() === "TEST");
  const prev = rows[current.index - 1];
  const next = rows[current.index + 1];

  return {
    id: current.lesson.id,
    module_id: current.module.id,
    module_title: current.module.title,
    title: current.lesson.title,
    lesson_type: current.lesson.lesson_type,
    item_type: "lesson",
    has_tests: hasTests || undefined,
    status: "current",
    status_label: current.lesson.status_label || "Hozirgi dars",
    duration_label: "0 daqiqa",
    is_locked: false,
    is_current: true,
    materials,
    video_url: video?.url || video?.file_url,
    file_url: materials.find((item) => item.file_url || item.url)?.file_url || materials.find((item) => item.url)?.url,
    prev_lesson_id: prev?.lesson.id ?? null,
    next_lesson_id: next?.lesson.id ?? null,
  };
}

export function mapMandatoryBlogToDirection(blog: QualificationDirection): MyDirection {
  const href = mandatoryLearningHref(blog.id);
  const publishedLessons = flattenMandatoryLessons(blog);
  const visibleModules = (blog.modules ?? []).filter((module) => {
    if (isRemovedModuleRecord(module as unknown as Record<string, unknown>)) return false;
    return isVisibleToStudent(module.status);
  });
  const modules = publishedLessons.length
    ? new Set(publishedLessons.map((row) => row.module.id)).size
    : visibleModules.length;
  const totalHours = blog.duration_hours ?? 0;
  return {
    id: `mandatory-blog-${blog.id}`,
    title: blog.title?.trim() || MANDATORY_BLOCK_TITLE,
    image: "/images/directions/d1.jpg",
    category: blog.category_name?.trim() || MANDATORY_BLOCK_TITLE,
    totalHours,
    completedHours: 0,
    modules,
    moduleTitles: visibleModules.map((module) => module.title).filter(Boolean),
    language: languageLabel(blog.language),
    startDate: new Date().toISOString().slice(0, 10),
    progress: 0,
    status: "active",
    currentLessonId: String(blog.id),
    progressColor: "blue",
    badgeClass: "bg-[#5B4BDB]",
    showActions: true,
    detailHref: href,
    continueHref: href,
  };
}

export function upcomingFromMandatoryBlogs(blogs: QualificationDirection[]): UpcomingLesson[] {
  const items: UpcomingLesson[] = [];
  for (const blog of blogs) {
    for (const row of flattenMandatoryLessons(blog)) {
      items.push({
        id: `mandatory-lesson-${row.lesson.id}`,
        directionId: `mandatory-blog-${blog.id}`,
        directionTitle: blog.title?.trim() || MANDATORY_BLOCK_TITLE,
        moduleTitle: `${row.module.title}: ${row.lesson.title}`,
        date: "today",
        time: "ochiq",
        type: String(row.lesson.lesson_type).toUpperCase() === "TEST" ? "test" : "lesson",
        tone: items.length % 3 === 0 ? "purple" : items.length % 3 === 1 ? "green" : "blue",
        href: mandatoryLearningHref(blog.id),
      });
      if (items.length >= 4) return items;
    }
  }
  return items;
}
