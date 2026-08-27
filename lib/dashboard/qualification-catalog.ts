import { getItCourse, getItDirection } from "@/lib/api/admin-it";
import { getCourse, getCourses } from "@/lib/api/courses";
import { getLearningCourse } from "@/lib/api/learning";
import {
  getQualificationDirection,
} from "@/lib/api/qualification";
import type {
  CourseCardResponse,
  CourseDetailResponse,
  CourseLessonSummary,
  CourseListQuery,
  CourseListResponse,
  CourseModuleResponse,
} from "@/lib/api/types/courses";
import type { ItDirection } from "@/lib/api/types/admin";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationModule,
} from "@/lib/api/types/qualification";
import { isItSource, mapItModule, mergeDirectionLists, mergeModules } from "@/lib/qualification/it-bridge";
import { loadMergedDirections } from "@/lib/qualification/load-directions";
import { matchPublishedContent, readQualificationSnapshot } from "@/lib/qualification/published-snapshot";
import { mapStoredLessonKind } from "@/lib/learning/lesson-kind";
import { parsePositiveInt } from "@/lib/api/unwrap";
import { isLessonListedForStudent, isModuleListedForStudent, isVisibleToStudent } from "@/lib/publish-status";

function emptyCourses(query: CourseListQuery): CourseListResponse {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 12;
  return {
    items: [],
    total: 0,
    page,
    per_page: perPage,
    total_pages: 1,
  };
}

function paginateCourses(items: CourseCardResponse[], query: CourseListQuery): CourseListResponse {
  const page = query.page ?? 1;
  const perPage = query.per_page ?? 12;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total,
    page: safePage,
    per_page: perPage,
    total_pages: totalPages,
  };
}

function settledValue<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

function catalogId(direction: QualificationDirection): number {
  return direction.itId ?? direction.id;
}

function asCardFromIt(item: ItDirection): CourseCardResponse {
  return {
    id: item.id,
    title: item.title,
    category_id: item.category_id,
    category_name: item.category_name,
    subject: item.subject,
    course_type: item.course_type,
    duration_hours: item.duration_hours,
    duration_label: item.duration_label,
    language: item.language,
    module_count: item.module_count ?? item.modules?.length ?? 0,
    status: item.status,
    status_label: item.status_label,
    thumbnail_url: item.thumbnail_url,
  };
}

function asCardFromQual(item: QualificationDirection): CourseCardResponse {
  return {
    id: catalogId(item),
    title: item.title,
    category_id: item.category_id,
    category_name: item.category_name,
    duration_hours: item.duration_hours,
    language: item.language,
    status: item.status,
    module_count: item.modules?.length ?? item.module_count ?? 0,
  };
}

function overlayCard(base: CourseCardResponse, overlay: CourseCardResponse): CourseCardResponse {
  return {
    ...base,
    title: overlay.title || base.title,
    category_id: overlay.category_id ?? base.category_id,
    category_name: overlay.category_name || base.category_name,
    subject: overlay.subject || base.subject,
    course_type: overlay.course_type || base.course_type,
    duration_hours: overlay.duration_hours ?? base.duration_hours,
    duration_label: overlay.duration_label || base.duration_label,
    language: overlay.language || base.language,
    language_label: overlay.language_label || base.language_label,
    module_count: Math.max(overlay.module_count ?? 0, base.module_count ?? 0),
    module_label: overlay.module_label || base.module_label,
    status: overlay.status || base.status,
    status_label: overlay.status_label || base.status_label,
    thumbnail_url: overlay.thumbnail_url || base.thumbnail_url,
  };
}

function asLessonFromQual(lesson: QualificationLesson): CourseLessonSummary | null {
  if (!lesson.id) return null;
  if (typeof lesson.lesson_number === "number" && lesson.lesson_number < 0) return null;
  if (!isLessonListedForStudent(lesson.status)) return null;
  const type = typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined;
  const isTest = String(type ?? "").toUpperCase() === "TEST";
  return {
    id: lesson.id,
    title: lesson.title,
    item_type: isTest ? "test" : "lesson",
    lesson_type: type,
    materials: (lesson.materials ?? [])
      .filter((item) => isLessonListedForStudent(item.status))
      .map((item) => ({
        id: item.id,
        title: item.title,
        material_type: typeof item.type === "string" ? item.type : undefined,
        url: item.url,
        file_url: item.file_url ?? item.url,
        file: item.file,
        status: item.status,
      })),
    status: lesson.status,
  };
}

function asModulesFromQual(modules: QualificationModule[]): CourseModuleResponse[] {
  return modules
    .filter((module) => isModuleListedForStudent(module.status))
    .map((module) => ({
      id: module.id,
      title: module.title,
      order_index: module.module_number,
      status: module.status,
      lessons: (module.lessons ?? []).map(asLessonFromQual).filter((item): item is CourseLessonSummary => item !== null),
    }));
}

function overlayLesson(base: CourseLessonSummary, overlay: CourseLessonSummary): CourseLessonSummary {
  return {
    ...base,
    title: overlay.title || base.title,
    duration_minutes: overlay.duration_minutes ?? base.duration_minutes,
    item_type: overlay.item_type || base.item_type,
    lesson_type:
      mapStoredLessonKind(overlay.lesson_type) ??
      mapStoredLessonKind(base.lesson_type) ??
      overlay.lesson_type ??
      base.lesson_type,
    materials: overlay.materials?.length ? overlay.materials : base.materials,
    assignments: overlay.assignments?.length ? overlay.assignments : base.assignments,
  };
}

function overlayModule(base: CourseModuleResponse, overlay: CourseModuleResponse, allowNew = true): CourseModuleResponse {
  const lessons = [...(base.lessons ?? [])];
  for (const lesson of overlay.lessons ?? []) {
    if (!isLessonListedForStudent(lesson.status)) continue;
    const index = lessons.findIndex((item) => item.id === lesson.id || item.title === lesson.title);
    if (index >= 0) lessons[index] = overlayLesson(lessons[index], lesson);
    else if (allowNew || !(base.lessons ?? []).length) lessons.push(lesson);
  }
  return {
    ...base,
    title: overlay.title || base.title,
    order_index: overlay.order_index ?? base.order_index,
    lessons: lessons.filter((lesson) => isLessonListedForStudent(lesson.status)),
  };
}

function mergeCourseModules(
  groups: Array<CourseModuleResponse[] | undefined>,
  allowNew = true,
): CourseModuleResponse[] {
  const merged: CourseModuleResponse[] = [];
  let sourceGroup = true;
  for (const group of groups) {
    for (const module of group ?? []) {
      if (!isModuleListedForStudent(module.status)) continue;
      const index = merged.findIndex(
        (item) =>
          item.id === module.id || item.title.trim().toLowerCase() === module.title.trim().toLowerCase()
      );
      if (index >= 0) merged[index] = overlayModule(merged[index], module, allowNew || sourceGroup);
      else if (allowNew || sourceGroup) merged.push(module);
    }
    sourceGroup = false;
  }
  return merged
    .filter((module) => isModuleListedForStudent(module.status))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}

function enrichAdminModules(
  adminModules: CourseModuleResponse[],
  extras: Array<CourseModuleResponse[] | undefined>,
): CourseModuleResponse[] {
  let modules = adminModules;
  for (const extra of extras) {
    modules = mergeCourseModules([modules, extra], false);
  }
  return modules;
}

function matchesQuery(item: CourseCardResponse, query: CourseListQuery): boolean {
  const needle = query.q?.trim().toLowerCase();
  if (needle && !item.title.toLowerCase().includes(needle)) return false;
  if (query.category_id && String(item.category_id ?? "") !== String(query.category_id)) return false;
  if (query.subject && (item.subject ?? "") !== query.subject) return false;
  if (query.course_type && (item.course_type ?? "") !== query.course_type) return false;
  if (query.status && item.status !== query.status && item.status_label !== query.status) return false;
  if (query.hours) {
    const hours = query.hours;
    if (item.duration_label !== hours && String(item.duration_hours ?? "") !== hours) return false;
  }
  if (query.modules) {
    if (String(item.module_count ?? "") !== query.modules && item.module_label !== query.modules) return false;
  }
  return true;
}

async function loadAdminDirections(): Promise<{
  ok: boolean;
  qualification: QualificationDirection[];
  it: ItDirection[];
}> {
  const loaded = await loadMergedDirections(true);
  const ok = loaded.qualification.length > 0 || loaded.it.length > 0;
  return { ok, qualification: loaded.qualification, it: loaded.it };
}

export async function getCatalogCourses(query: CourseListQuery = {}, silentAuth = false): Promise<CourseListResponse> {
  const [coursesResult, admin] = await Promise.all([
    getCourses(query, silentAuth).catch(() => emptyCourses(query)),
    loadAdminDirections(),
  ]);

  if (!admin.ok) {
    return coursesResult;
  }

  const overlayQuery: CourseListQuery = {
    q: query.q,
    category_id: query.category_id,
    page: 1,
    per_page: 100,
  };
  const overlayCourses =
    (query.page ?? 1) === 1 && (query.per_page ?? 12) >= 50
      ? coursesResult
      : await getCourses(overlayQuery, silentAuth).catch(() => coursesResult);

  const mergedDirections = mergeDirectionLists(admin.qualification, admin.it);
  if (!mergedDirections.length) {
    return coursesResult;
  }
  const courseById = new Map(overlayCourses.items.map((item) => [item.id, item]));
  const itById = new Map(admin.it.map((item) => [item.id, item]));
  const cards: CourseCardResponse[] = [];
  const usedIds = new Set<number>();

  for (const direction of mergedDirections) {
    if (!isVisibleToStudent(direction.status)) continue;
    const id = catalogId(direction);
    const itItem = direction.itId ? itById.get(direction.itId) : itById.get(direction.id);
    let card = asCardFromQual(direction);
    if (itItem) {
      card = overlayCard(asCardFromIt(itItem), {
        ...card,
        module_count: Math.max(itItem.module_count ?? itItem.modules?.length ?? 0, direction.modules?.length ?? 0),
      });
    }
    const publicCard = courseById.get(id);
    if (publicCard) card = overlayCard(publicCard, card);
    cards.push(card);
    usedIds.add(card.id);
  }

  for (const publicCard of overlayCourses.items) {
    if (!usedIds.has(publicCard.id)) {
      cards.push(publicCard);
      usedIds.add(publicCard.id);
    }
  }

  return paginateCourses(
    cards.filter((item) => isVisibleToStudent(item.status) && matchesQuery(item, query)),
    query
  );
}

export async function getCatalogCourse(id: string): Promise<CourseDetailResponse> {
  const numeric = parsePositiveInt(id);
  const [courseResult, itResult, itCourseResult, learningResult, mergedResult, snapshotResult] = await Promise.allSettled([
    getCourse(id, true),
    numeric ? getItDirection(numeric, true) : Promise.reject(new Error("skip")),
    numeric ? getItCourse(numeric, true) : Promise.reject(new Error("skip")),
    numeric ? getLearningCourse(numeric, true) : Promise.reject(new Error("skip")),
    loadMergedDirections(true),
    readQualificationSnapshot({ forceNetwork: true }),
  ]);

  const course = settledValue(courseResult);
  let itDirection = settledValue(itResult) ?? settledValue(itCourseResult);
  if (itDirection && !isVisibleToStudent(itDirection.status)) itDirection = null;
  const learning = settledValue(learningResult);
  const merged = settledValue(mergedResult);
  const qualificationList = merged?.merged ?? [];
  const qualificationMatch = qualificationList.find(
    (item) => (item.id === numeric || item.itId === numeric) && isVisibleToStudent(item.status)
  );

  let qualificationDirection = qualificationMatch
    ? await getQualificationDirection(qualificationMatch.id, true).catch(() => qualificationMatch)
    : null;
  if (qualificationDirection && !isVisibleToStudent(qualificationDirection.status)) {
    qualificationDirection = null;
  }

  const itId = qualificationDirection?.itId ?? (isItSource(qualificationMatch?.source) ? qualificationMatch?.id : undefined);
  if (!itDirection && itId) {
    itDirection =
      (await getItDirection(itId, true).catch(() => null)) ??
      (await getItCourse(itId, true).catch(() => null));
    if (itDirection && !isVisibleToStudent(itDirection.status)) itDirection = null;
  }

  if (!course && !itDirection && !qualificationDirection && !learning) {
    if (courseResult.status === "rejected") throw courseResult.reason;
    throw new Error("Kurs topilmadi");
  }

  const qualModules = mergeModules(
    (qualificationDirection?.modules ?? []).map((item) => ({ ...item, source: item.source ?? "qualification" })),
    itDirection ? (itDirection.modules ?? []).map((item) => mapItModule(item, itDirection!.id)) : []
  );
  const adminModules = asModulesFromQual(qualModules);
  const snapshot = settledValue(snapshotResult) ?? [];
  const snapMatch = matchPublishedContent(snapshot, {
    courseId: numeric,
    titles: [qualificationDirection?.title, itDirection?.title, course?.title, learning?.title],
  });
  const snapshotModules = snapMatch ? asModulesFromQual(snapMatch.modules ?? []) : null;

  const learningModules: CourseModuleResponse[] = (learning?.modules ?? [])
    .filter((module) => isModuleListedForStudent(module.status))
    .map((module) => ({
      id: module.id,
      title: module.title,
      order_index: module.order_index,
      status: module.status,
      lessons: (module.lessons ?? module.items ?? [])
        .filter((lesson) => isLessonListedForStudent(lesson.status))
        .map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          item_type: lesson.item_type,
          lesson_type: lesson.lesson_type,
          status: lesson.status,
        })),
    }));

  const snapshotHasLessons = Boolean(
    snapshotModules?.some((module) => (module.lessons ?? []).length > 0)
  );
  const adminHasLessons = adminModules.some((module) => (module.lessons ?? []).length > 0);
  const publishedModules = snapshotHasLessons
    ? snapshotModules
    : adminHasLessons
      ? adminModules
      : snapshotModules?.length
        ? snapshotModules
        : adminModules.length
          ? adminModules
          : null;
  const modules = snapMatch
    ? snapshotHasLessons
      ? enrichAdminModules(snapshotModules ?? [], [adminModules])
      : adminHasLessons
        ? adminModules
        : snapshotModules ?? []
    : publishedModules
      ? enrichAdminModules(publishedModules, [adminModules, course?.modules, learningModules])
      : mergeCourseModules([course?.modules, learningModules]);

  const itCard = itDirection ? asCardFromIt(itDirection) : null;
  const qualCard = qualificationDirection ? asCardFromQual(qualificationDirection) : null;
  const base = course ?? itCard ?? qualCard ?? { id: numeric ?? 0, title: learning?.title ?? "" };

  return {
    ...base,
    id: course?.id ?? itDirection?.id ?? (qualificationDirection ? catalogId(qualificationDirection) : numeric) ?? 0,
    title:
      snapMatch?.title ||
      qualificationDirection?.title ||
      itDirection?.title ||
      course?.title ||
      learning?.title ||
      "",
    category_id: itDirection?.category_id ?? qualificationDirection?.category_id ?? course?.category_id,
    category_name: itDirection?.category_name || qualificationDirection?.category_name || course?.category_name,
    description: course?.description || itDirection?.description || learning?.description,
    duration_hours: itDirection?.duration_hours ?? course?.duration_hours,
    duration_label: itDirection?.duration_label || course?.duration_label,
    language: itDirection?.language || course?.language,
    status: qualificationDirection?.status || itDirection?.status || course?.status,
    status_label: itDirection?.status_label || course?.status_label,
    thumbnail_url: itDirection?.thumbnail_url || course?.thumbnail_url,
    modules,
    module_count: modules.length,
  };
}

export function catalogCourseFromPublished(
  match: QualificationDirection,
  fallbackId?: number
): CourseDetailResponse {
  const modules = asModulesFromQual(match.modules ?? []);
  return {
    id: match.itId && match.itId > 0 ? match.itId : match.id || fallbackId || 0,
    title: match.title,
    category_id: match.category_id,
    category_name: match.category_name,
    duration_hours: match.duration_hours,
    status: match.status,
    modules,
    module_count: modules.length,
  };
}

export function overlayCatalogWithSnapshot(
  catalog: CourseDetailResponse | null,
  snapshot: QualificationDirection[],
  courseId?: number,
  title?: string
): CourseDetailResponse | null {
  const match = matchPublishedContent(snapshot, {
    courseId,
    titles: [title, catalog?.title],
  });
  if (!match) return catalog;
  return catalogCourseFromPublished(match, courseId ?? catalog?.id);
}
