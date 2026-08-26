/**
 * Nashr holati — admin DRAFT|PUBLISHED|INACTIVE|ARCHIVED.
 * Foydalanuvchi (student): DRAFT/INACTIVE/ARCHIVED yashirin, PUBLISHED ko'rinadi.
 * Progress statuslari (current/locked/completed) nashr emas — yashirilmaydi.
 */

const HIDDEN = new Set(["DRAFT", "INACTIVE", "ARCHIVED", "DELETED"]);
const PUBLISHED = new Set(["PUBLISHED", "OPEN"]);
const PROGRESS = new Set([
  "CURRENT",
  "LOCKED",
  "COMPLETED",
  "AVAILABLE",
  "UNLOCKED",
  "IN_PROGRESS",
  "INPROGRESS",
]);

export function normalizePublishStatus(status?: string | null) {
  return (status ?? "").trim().toUpperCase().replace(/-/g, "_");
}

export function isHiddenFromStudent(status?: string | null) {
  return HIDDEN.has(normalizePublishStatus(status));
}

/** Studentga ko'rinsinmi: PUBLISHED / bo'sh / progress. DRAFT oilasi — yo'q. */
export function isVisibleToStudent(status?: string | null) {
  const upper = normalizePublishStatus(status);
  if (!upper) return true;
  if (HIDDEN.has(upper)) return false;
  if (PUBLISHED.has(upper)) return true;
  if (PROGRESS.has(upper)) return true;
  return true;
}

export function isPublishedForStudent(status?: string | null) {
  return isVisibleToStudent(status);
}

/** Soft-delete / arxiv: lesson_number = -id, DELETED status, deleted_at. */
export function isRemovedLessonRecord(row: Record<string, unknown> | null | undefined) {
  if (!row) return false;
  if (isHiddenFromStudent(typeof row.status === "string" ? row.status : null)) return true;
  const number = Number(row.lesson_number ?? row.sort_order);
  if (Number.isFinite(number) && number < 0) return true;
  if (row.is_deleted === true || row.deleted === true || row.is_archived === true) return true;
  if (typeof row.deleted_at === "string" && row.deleted_at.trim()) return true;
  return false;
}

type NestedMaterial = { status?: string | null };
type NestedLesson = {
  id?: number;
  lesson_number?: number;
  status?: string | null;
  materials?: NestedMaterial[];
};
type NestedModule = {
  status?: string | null;
  lessons?: NestedLesson[];
};
type NestedBlog = {
  status?: string | null;
  module_count?: number;
  modules?: NestedModule[];
};

/** Studentga faqat PUBLISHED daraxt: blog/modul/dars/material DRAFT oilasi kesiladi. */
export function filterPublishedContentTree<T extends NestedBlog>(blog: T): T | null {
  if (!isVisibleToStudent(blog.status)) return null;
  const modules = (blog.modules ?? [])
    .filter((module) => isVisibleToStudent(module.status))
    .map((module) => ({
      ...module,
      lessons: (module.lessons ?? [])
        .filter((lesson) => {
          if (lesson.id == null || Number(lesson.id) <= 0) return false;
          if (isRemovedLessonRecord(lesson as Record<string, unknown>)) return false;
          return isVisibleToStudent(lesson.status);
        })
        .map((lesson) => ({
          ...lesson,
          materials: (lesson.materials ?? []).filter((item) => isVisibleToStudent(item.status)),
        })),
    }));
  return { ...blog, modules, module_count: modules.length || blog.module_count };
}

export function filterPublishedContentTrees<T extends NestedBlog>(items: T[]): T[] {
  return items
    .map((item) => filterPublishedContentTree(item))
    .filter((item): item is T => item != null);
}

/** Soft-delete dars (lesson_number = -id, DELETED) admin daraxtidan ham tushadi. */
export function dropRemovedLessonsFromTree<T extends NestedBlog>(blog: T): T {
  const modules = (blog.modules ?? []).map((module) => ({
    ...module,
    lessons: (module.lessons ?? []).filter((lesson) => {
      if (lesson.id == null || Number(lesson.id) <= 0) return false;
      return !isRemovedLessonRecord(lesson as Record<string, unknown>);
    }),
  }));
  return { ...blog, modules };
}
