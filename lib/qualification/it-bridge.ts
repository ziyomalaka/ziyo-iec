import { submitLessonMaterial } from "@/lib/api/qualification";
import type { ItCourse, ItDirection, ItLesson, ItMaterial, ItModule } from "@/lib/api/types/admin";
import type {
  ContentSource,
  MaterialFormData,
  QualificationDirection,
  QualificationLesson,
  QualificationMaterial,
  QualificationMaterialType,
  QualificationModule,
} from "@/lib/api/types/qualification";
import { formatLessonCode } from "@/lib/qualification/constants";
import { mapStoredLessonKind } from "@/lib/learning/lesson-kind";
import { isRemovedLessonRecord } from "@/lib/publish-status";

export function directionKey(direction: Pick<QualificationDirection, "id" | "source" | "itId">) {
  return `${direction.source ?? "qualification"}-${direction.id}-${direction.itId ?? 0}`;
}

export function isItSource(source?: ContentSource) {
  return source === "it";
}

export function isMandatorySource(source?: ContentSource) {
  return source === "mandatory";
}

export function wizardDirectionId(direction: QualificationDirection, qualModule?: QualificationModule) {
  if (isItSource(qualModule?.source) || isItSource(direction.source)) {
    return direction.itId ?? direction.id;
  }
  return direction.id;
}

export function wizardSource(direction: QualificationDirection, qualModule?: QualificationModule): ContentSource {
  if (isItSource(qualModule?.source) || isItSource(direction.source)) return "it";
  if (isMandatorySource(qualModule?.source) || isMandatorySource(direction.source)) return "mandatory";
  return "qualification";
}

function normTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function itLessonKind(lesson: ItLesson): QualificationLesson["lesson_type"] {
  const lessonType = String(lesson.lesson_type ?? "").toLowerCase();
  if (lesson.item_type === "test" || lessonType === "test") return undefined;
  return mapStoredLessonKind(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined);
}

function mapItMaterialType(type?: string): QualificationMaterialType | string {
  const key = (type ?? "").toLowerCase();
  if (key === "video") return "VIDEO";
  if (key === "presentation") return "PRESENTATION";
  if (key === "lecture" || key === "guide") return "GUIDE";
  if (key === "pdf" || key === "word") return "GUIDE";
  if (key === "test") return "TEST";
  if (key === "seminar") return "SEMINAR";
  return type?.toUpperCase() || "GUIDE";
}

function mapItMaterial(item: ItMaterial, lessonId: number): QualificationMaterial {
  const url = item.url || item.file_url || item.file?.url;
  return {
    id: item.id,
    lesson_id: item.lesson_id ?? lessonId,
    type: mapItMaterialType(item.material_type),
    title: item.title,
    source: "it",
    status: item.status,
    url,
    file_url: url,
    file: url ? { url } : undefined,
  };
}

export function mapItLesson(lesson: ItLesson, moduleNumber?: number): QualificationLesson {
  const lessonNumber = lesson.order_index;
  const materials: QualificationMaterial[] = (lesson.materials ?? []).map((item) => mapItMaterial(item, lesson.id));
  for (const assignment of lesson.assignments ?? []) {
    materials.push({
      id: assignment.id,
      lesson_id: assignment.lesson_id ?? lesson.id,
      type: "SEMINAR",
      title: assignment.title,
      source: "it",
    });
  }
  if (!materials.length && (lesson.video_url || lesson.file_url || lesson.content_url)) {
    const url = lesson.video_url || lesson.file_url || lesson.content_url;
    const materialKind = mapStoredLessonKind(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined)
      ? "video"
      : typeof lesson.lesson_type === "string"
        ? lesson.lesson_type
        : "video";
    materials.push({
      id: lesson.id,
      lesson_id: lesson.id,
      type: mapItMaterialType(materialKind),
      title: lesson.title,
      source: "it",
      url,
      file_url: url,
      file: url ? { url } : undefined,
    });
  }
  if (lesson.item_type === "test" || lesson.lesson_type === "test") {
    materials.unshift({
      id: lesson.id,
      lesson_id: lesson.id,
      type: "TEST",
      title: lesson.title,
      source: "it",
    });
  }
  return {
    id: lesson.id,
    title: lesson.title,
    module_id: undefined,
    lesson_number: lessonNumber,
    lesson_code: formatLessonCode(moduleNumber ?? null, lessonNumber ?? null),
    lesson_type: itLessonKind(lesson),
    status: lesson.status,
    materials,
    source: "it",
  };
}

export function mapItModule(item: ItModule, directionId: number): QualificationModule {
  const moduleNumber = item.order_index;
  return {
    id: item.id,
    direction_id: directionId,
    module_number: moduleNumber,
    title: item.title,
    status: item.status,
    status_label: item.status_label,
    source: "it",
    lessons: (item.lessons ?? [])
      .map((lesson) => mapItLesson(lesson, moduleNumber))
      .filter((lesson) => lesson.id && !isRemovedLessonRecord(lesson as unknown as Record<string, unknown>)),
  };
}

export function mapItDirection(item: ItDirection): QualificationDirection {
  return {
    id: item.id,
    title: item.title,
    source: "it",
    itId: item.id,
    category_id: item.category_id,
    category_name: item.category_name,
    description: item.description,
    duration_hours: item.duration_hours,
    language: item.language,
    status: item.status,
    modules: (item.modules ?? []).map((row) => mapItModule(row, item.id)),
  };
}

function mergeLessons(primary: QualificationLesson[], extra: QualificationLesson[]) {
  const result: QualificationLesson[] = [];
  const used = new Set<number>();
  for (const lesson of primary) {
    const match = extra.find((row) => !used.has(row.id) && normTitle(row.title) === normTitle(lesson.title));
    if (match) {
      used.add(match.id);
      const materials = [...(lesson.materials ?? [])];
      for (const item of match.materials ?? []) {
        if (!materials.some((row) => row.id === item.id && row.source === item.source)) materials.push(item);
      }
      result.push({
        ...lesson,
        lesson_type:
          mapStoredLessonKind(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined) ??
          mapStoredLessonKind(typeof match.lesson_type === "string" ? match.lesson_type : undefined) ??
          lesson.lesson_type ??
          match.lesson_type,
        materials,
      });
    } else {
      result.push(lesson);
    }
  }
  for (const lesson of extra) {
    if (!used.has(lesson.id)) result.push(lesson);
  }
  return result.sort((a, b) => (a.lesson_number ?? 0) - (b.lesson_number ?? 0));
}

export function mergeModules(primary: QualificationModule[], extra: QualificationModule[]) {
  const result: QualificationModule[] = [];
  const used = new Set<number>();
  for (const item of primary) {
    const match = extra.find((row) => !used.has(row.id) && normTitle(row.title) === normTitle(item.title));
    if (match) {
      used.add(match.id);
      result.push({
        ...item,
        source: item.source ?? "qualification",
        status: item.status || match.status,
        status_label: item.status_label || match.status_label,
        lessons: mergeLessons(item.lessons ?? [], match.lessons ?? []),
      });
    } else {
      result.push({ ...item, source: item.source ?? "qualification" });
    }
  }
  for (const item of extra) {
    if (!used.has(item.id)) result.push(item);
  }
  return result.sort((a, b) => (a.module_number ?? 0) - (b.module_number ?? 0));
}

export function mergeItEntities(directions: ItDirection[], courses: ItCourse[]): ItDirection[] {
  const byId = new Map<number, ItDirection>();
  for (const item of directions) {
    if (item.id) byId.set(item.id, item);
  }
  for (const item of courses) {
    if (!item.id) continue;
    const prev = byId.get(item.id);
    byId.set(item.id, {
      id: item.id,
      title: item.title || prev?.title || "",
      description: item.description || prev?.description,
      thumbnail_url: item.thumbnail_url || prev?.thumbnail_url,
      duration_hours: item.duration_hours ?? prev?.duration_hours,
      duration_label: prev?.duration_label,
      language: item.language || prev?.language,
      category_id: item.category_id ?? prev?.category_id,
      category_name: item.category_name || prev?.category_name,
      status: item.status || prev?.status,
      status_label: item.status_label || prev?.status_label,
      course_type: item.course_type || prev?.course_type,
      subject: item.subject || prev?.subject,
      module_count: item.modules?.length || prev?.module_count || prev?.modules?.length,
      modules: item.modules?.length ? item.modules : prev?.modules,
    });
  }
  return Array.from(byId.values());
}

export function mergeDirectionLists(qualification: QualificationDirection[], it: ItDirection[]) {
  const result: QualificationDirection[] = [];
  const usedIt = new Set<number>();
  for (const item of qualification) {
    const match = it.find((row) => !usedIt.has(row.id) && normTitle(row.title) === normTitle(item.title));
    if (match) {
      usedIt.add(match.id);
      result.push({
        ...item,
        source: "qualification",
        itId: match.id,
        category_id: match.category_id ?? item.category_id,
        category_name: match.category_name || item.category_name,
        description: match.description || item.description,
        duration_hours: match.duration_hours ?? item.duration_hours,
        language: match.language || item.language,
        status: match.status || item.status,
        modules: undefined,
      });
    } else {
      result.push({ ...item, source: "qualification", modules: undefined });
    }
  }
  for (const item of it) {
    if (!usedIt.has(item.id)) {
      result.push({
        id: item.id,
        title: item.title,
        source: "it",
        itId: item.id,
        category_id: item.category_id,
        category_name: item.category_name,
        description: item.description,
        duration_hours: item.duration_hours,
        language: item.language,
        status: item.status,
        modules: undefined,
      });
    }
  }
  return result;
}

/** IT yo'nalish materiali — admin files + materials API (submitLessonMaterial alias). */
export async function submitItLessonMaterial(
  lessonId: number,
  item: MaterialFormData,
  options?: { onProgress?: (percent: number) => void; signal?: AbortSignal }
) {
  return submitLessonMaterial(lessonId, item, options);
}
