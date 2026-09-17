/**
 * Public malaka oshirish katalogi — Swagger `courses`.
 * GET /courses, GET /courses/filters, GET /courses/{id}
 */
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { pickFileUrl } from "@/lib/api/media";
import { pickDirectionThumbnail } from "@/lib/qualification/direction-image";
import { COURSES_API_PREFIX } from "@/lib/api/student-api";
import { asList, asPaged, parsePositiveInt, unwrapApiPayload } from "@/lib/api/unwrap";
import { lessonKindFromDescription, mapStoredLessonKind } from "@/lib/learning/lesson-kind";
import { isRemovedLessonRecord, isVisibleToStudent } from "@/lib/publish-status";
import type {
  CourseBlockResponse,
  CourseCardResponse,
  CourseDetailResponse,
  CourseFiltersResponse,
  CourseLessonSummary,
  CourseListQuery,
  CourseListResponse,
  CourseModuleResponse,
  FilterOption,
} from "@/lib/api/types/courses";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function toQuery(query: CourseListQuery) {
  const params = new URLSearchParams();

  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.category_id) params.set("category_id", query.category_id);
  if (query.subject) params.set("subject", query.subject);
  if (query.course_type) params.set("course_type", query.course_type);
  if (query.hours) {
    const hours = String(query.hours).match(/\d+/)?.[0] ?? query.hours;
    params.set("hours", hours);
  }
  if (query.modules) {
    const modules = String(query.modules).match(/\d+/)?.[0] ?? query.modules;
    params.set("modules", modules);
  }
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.per_page) params.set("per_page", String(query.per_page));

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function mapFilterOption(data: unknown): FilterOption | null {
  if (typeof data === "string" || typeof data === "number") {
    const value = String(data);
    return value ? { value, label: value } : null;
  }
  const row = asRecord(data);
  const value = row.value ?? row.id ?? row.slug ?? row.key;
  const label = row.label ?? row.name ?? row.title ?? value;
  if (value == null && (label == null || label === "")) return null;
  return { value: String(value ?? label), label: String(label ?? value) };
}

function mapFilterOptions(data: unknown): FilterOption[] {
  return asList<unknown>(data)
    .map(mapFilterOption)
    .filter((item): item is FilterOption => item !== null);
}

function mapCourseCard(data: unknown): CourseCardResponse | null {
  const row = asRecord(unwrapApiPayload(data));
  const id = parsePositiveInt(row.id);
  if (!id) return null;
  const status = optionalString(row.status);
  if (!isVisibleToStudent(status)) return null;
  return {
    id,
    title: String(row.title ?? row.name ?? ""),
    category_id: parsePositiveInt(row.category_id) ?? undefined,
    category_name: optionalString(row.category_name),
    subject: optionalString(row.subject),
    course_type: optionalString(row.course_type),
    duration_hours: parsePositiveInt(row.duration_hours) ?? undefined,
    duration_label: optionalString(row.duration_label),
    language: optionalString(row.language),
    language_label: optionalString(row.language_label),
    module_count: parsePositiveInt(row.module_count) ?? undefined,
    module_label: optionalString(row.module_label),
    status,
    status_label: optionalString(row.status_label),
    thumbnail_url: pickDirectionThumbnail(row),
    kind: optionalString(row.kind),
    retraining_type: optionalString(row.retraining_type),
    application_id: parsePositiveInt(row.application_id) ?? undefined,
    application_status: optionalString(row.application_status),
    can_apply: typeof row.can_apply === "boolean" ? row.can_apply : undefined,
    cta: optionalString(row.cta),
    reject_reason: optionalString(row.reject_reason),
  };
}

function mapLesson(data: unknown): CourseLessonSummary | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id);
  if (!id) return null;
  if (isRemovedLessonRecord(row)) return null;
  const status = optionalString(row.status);
  if (!isVisibleToStudent(status)) return null;
  return {
    id,
    title: String(row.title ?? ""),
    duration_minutes: parsePositiveInt(row.duration_minutes) ?? undefined,
    item_type: optionalString(row.item_type),
    lesson_type:
      mapStoredLessonKind(optionalString(row.lesson_type)) ??
      lessonKindFromDescription(optionalString(row.description)) ??
      optionalString(row.lesson_type),
    status,
    materials: Array.isArray(row.materials)
      ? row.materials.flatMap((item) => {
          const material = asRecord(item);
          if (!isVisibleToStudent(optionalString(material.status))) return [];
          const url = pickFileUrl(material);
          return [{
            title: optionalString(material.title),
            material_type: optionalString(material.material_type) ?? optionalString(material.type),
            url: url || undefined,
            file_url: url || undefined,
            file: url ? { url } : undefined,
            content_text: optionalString(material.content_text),
            status: optionalString(material.status),
          }];
        })
      : undefined,
    assignments: Array.isArray(row.assignments)
      ? row.assignments.map((item) => {
          const assignment = asRecord(item);
          const url = pickFileUrl(assignment);
          return {
            title: optionalString(assignment.title),
            description: optionalString(assignment.description),
            file_url: url || undefined,
          };
        })
      : undefined,
  };
}

function mapModule(data: unknown, fallbackBlockId?: number): CourseModuleResponse | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id);
  if (!id) return null;
  const status = optionalString(row.status);
  if (!isVisibleToStudent(status)) return null;
  const order = Number(row.order_index) || Number(row.module_number) || Number(row.sort_order);
  const lessons = Array.isArray(row.lessons)
    ? row.lessons.map(mapLesson).filter((item): item is CourseLessonSummary => item !== null)
    : undefined;
  if (lessons && lessons.length === 0) return null;
  const blockId =
    parsePositiveInt(row.block_id) ??
    parsePositiveInt(row.blockId) ??
    parsePositiveInt(asRecord(row.block).id) ??
    fallbackBlockId;
  return {
    id,
    title: String(row.title ?? ""),
    order_index: Number.isFinite(order) && order > 0 ? order : undefined,
    status,
    description: optionalString(row.description),
    block_id: blockId,
    lessons,
  };
}

function mapCourseBlocks(value: unknown): CourseBlockResponse[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      const row = asRecord(item);
      const id = parsePositiveInt(row.id) ?? parsePositiveInt(row.block_id);
      if (!id) return null;
      const order = Number(row.order_index) || Number(row.block_number) || Number(row.order);
      const modules = Array.isArray(row.modules)
        ? row.modules.map((mod) => mapModule(mod, id)).filter((mod): mod is CourseModuleResponse => Boolean(mod))
        : [];
      return {
        id,
        title: String(row.title ?? row.name ?? row.block_title ?? ""),
        block_number: parsePositiveInt(row.block_number) ?? (Number.isFinite(order) && order > 0 ? order : index + 1),
        order_index: Number.isFinite(order) && order > 0 ? order : undefined,
        modules,
      } satisfies CourseBlockResponse;
    })
    .filter((item): item is CourseBlockResponse => item !== null);
}

function pickCourseBlocks(row: Record<string, unknown>) {
  const keys = ["blocks", "content_blocks", "retraining_blocks", "direction_blocks"];
  for (const key of keys) {
    if (Array.isArray(row[key]) && (row[key] as unknown[]).length) return mapCourseBlocks(row[key]);
  }
  const sections = row.sections;
  if (Array.isArray(sections) && sections.length) {
    const first = asRecord(sections[0]);
    if (Array.isArray(first.modules) || first.block_number != null || first.block_id != null) {
      return mapCourseBlocks(sections);
    }
  }
  return [];
}

function mapCourseDetail(data: unknown): CourseDetailResponse {
  const row = asRecord(unwrapApiPayload(data));
  const card = mapCourseCard(row) ?? {
    id: parsePositiveInt(row.id) ?? 0,
    title: String(row.title ?? ""),
    status: optionalString(row.status),
  };
  const blocks = pickCourseBlocks(row);
  const nestedModules = blocks.flatMap((item) => item.modules ?? []);
  const topModules = Array.isArray(row.modules)
    ? row.modules.map((item) => mapModule(item)).filter((item): item is CourseModuleResponse => item !== null)
    : [];
  const byId = new Map<number, CourseModuleResponse>();
  for (const item of topModules) byId.set(item.id, item);
  for (const item of nestedModules) {
    const prev = byId.get(item.id);
    byId.set(item.id, {
      ...prev,
      ...item,
      block_id: item.block_id ?? prev?.block_id,
      description: item.description ?? prev?.description,
      lessons: item.lessons?.length ? item.lessons : prev?.lessons,
    });
  }
  const modules = [...byId.values()].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return {
    ...card,
    description: optionalString(row.description),
    goal: optionalString(row.goal ?? row.purpose),
    requirements: optionalString(row.requirements),
    admission: optionalString(row.admission ?? row.admission_terms),
    study_form: optionalString(row.study_form ?? row.study_format ?? row.format),
    modules,
    blocks: blocks.length ? blocks : undefined,
  };
}

function silentGet(silentAuth?: boolean) {
  return silentAuth ? { skipAuthRedirect: true } : {};
}

function coursesPath(prefix: string, rest = "") {
  const base = (prefix || COURSES_API_PREFIX.malaka).replace(/\/$/, "");
  if (!rest) return base;
  return `${base}${rest.startsWith("/") ? rest : `/${rest}`}`;
}

/** GET /courses — filtr, qidiruv, pagination */
export async function getCourses(
  query: CourseListQuery = {},
  silentAuth = false,
  prefix: string = COURSES_API_PREFIX.malaka
): Promise<CourseListResponse> {
  const data = await apiRequest<unknown>(`${coursesPath(prefix)}${toQuery(query)}`, silentGet(silentAuth));
  const page = asPaged<unknown>(data);
  const items = (page.items.length ? page.items : asList<unknown>(data, ["items", "courses"]))
    .map(mapCourseCard)
    .filter((item): item is CourseCardResponse => item !== null);
  return {
    items,
    page: page.page,
    per_page: page.per_page,
    total: page.total || items.length,
    total_pages: page.total_pages || 1,
  };
}

/** GET /courses/{id} */
export async function getCourse(
  id: string | number,
  silentAuth = false,
  prefix: string = COURSES_API_PREFIX.malaka,
  query: Pick<CourseListQuery, "retraining_type"> = {}
) {
  const detail = mapCourseDetail(
    await apiRequest<unknown>(
      `${coursesPath(prefix, `/${encodeURIComponent(String(id))}`)}${toQuery(query)}`,
      silentGet(silentAuth)
    )
  );
  if (!isVisibleToStudent(detail.status)) {
    throw new ApiError(404, "Kurs topilmadi");
  }
  return detail;
}

/** GET /courses/filters */
export async function getCourseFilters(
  silentAuth = false,
  prefix: string = COURSES_API_PREFIX.malaka,
  query: Pick<CourseListQuery, "retraining_type"> = {}
): Promise<CourseFiltersResponse> {
  const data = await apiRequest<unknown>(
    `${coursesPath(prefix, "/filters")}${toQuery(query)}`,
    silentGet(silentAuth)
  );
  const row = asRecord(unwrapApiPayload(data));
  return {
    directions: mapFilterOptions(row.directions ?? row.categories),
    subjects: mapFilterOptions(row.subjects),
    course_types: mapFilterOptions(row.course_types ?? row.types),
    hours: mapFilterOptions(row.hours),
    modules: mapFilterOptions(row.modules),
    statuses: mapFilterOptions(row.statuses),
  };
}
