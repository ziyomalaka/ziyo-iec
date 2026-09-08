/**
 * Qayta tayyorlash (admin) API — Swagger `retraining-admin`
 * https://hassle-conceded-washtub.ngrok-free.dev/swagger/index.html#/retraining-admin
 *
 * Yo'nalishlar: GET|POST   /api/v1/admin/retraining-directions
 *               GET|PATCH|DELETE /api/v1/admin/retraining-directions/{id}
 * Modullar:     GET|POST   /api/v1/admin/retraining-directions/{id}/modules
 *
 * Modul/dars/material ostki resurslari umumiy admin endpointlari —
 * `/api/v1/admin/modules|lessons|materials` (qualification bilan bir xil).
 */
import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { pickFileUrl } from "@/lib/api/media";
import {
  createQualificationLesson,
  deleteQualificationLesson,
  deleteQualificationMaterial,
  deleteQualificationModule,
  getQualificationLessons,
  getQualificationMaterials,
  getQualificationTests,
  updateQualificationLesson,
  updateQualificationModule,
} from "@/lib/api/qualification";
import type {
  CreateQualificationDirectionPayload,
  CreateQualificationLessonPayload,
  CreateQualificationModulePayload,
  QualificationDirection,
  QualificationLesson,
  QualificationMaterial,
  QualificationModule,
} from "@/lib/api/types/qualification";
import { asList, asPaged, parsePositiveInt, parseSignedInt, pickEntityId, unwrapApiPayload } from "@/lib/api/unwrap";
import { isRemovedLessonRecord, isRemovedModuleRecord } from "@/lib/publish-status";
import { formatLessonCode } from "@/lib/qualification/constants";

const Q = "/api/v1/admin";
const B = `${Q}/retraining-directions`;
const SOURCE = "retraining" as const;

export type RetrainingDirectionQuery = {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
  category_id?: number;
};

type RequestMeta = {
  idempotencyKey?: string;
};

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function silentGet(silentAuth?: boolean): ApiRequestOptions {
  return silentAuth ? { skipAuthRedirect: true } : {};
}

function jsonHeaders(meta?: RequestMeta): HeadersInit | undefined {
  if (!meta?.idempotencyKey) return undefined;
  return { "Idempotency-Key": meta.idempotencyKey };
}

function listQuery(query: RetrainingDirectionQuery = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.per_page) params.set("per_page", String(query.per_page));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status?.trim()) params.set("status", query.status.trim().toUpperCase());
  if (query.category_id) params.set("category_id", String(query.category_id));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function mapMaterial(data: unknown): QualificationMaterial {
  const row = asRecord(unwrapApiPayload(data));
  const file = asRecord(row.file);
  const url = pickFileUrl(row);
  return {
    id: parsePositiveInt(row.id) ?? 0,
    lesson_id: parsePositiveInt(row.lesson_id) ?? undefined,
    type: typeof row.type === "string" ? row.type : typeof row.material_type === "string" ? row.material_type : undefined,
    title: typeof row.title === "string" ? row.title : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    source: SOURCE,
    url: url || undefined,
    file_url: url || undefined,
    file:
      url || file.id || file.storage_path
        ? {
            id: parsePositiveInt(file.id) ?? undefined,
            url: url || undefined,
            storage_path: typeof file.storage_path === "string" ? file.storage_path : undefined,
          }
        : undefined,
  };
}

function mapLesson(data: unknown, moduleId?: number, moduleNumber?: number): QualificationLesson {
  const row = asRecord(unwrapApiPayload(data));
  const lessonNumber = parseSignedInt(row.lesson_number) ?? parseSignedInt(row.sort_order) ?? undefined;
  const hasMaterials = Array.isArray(row.materials);
  const hasTests = Array.isArray(row.tests);
  const materials = hasMaterials ? (row.materials as unknown[]).map(mapMaterial) : [];
  const tests = hasTests ? (row.tests as unknown[]).map(mapMaterial) : [];
  return {
    id: parsePositiveInt(row.id) ?? 0,
    module_id: parsePositiveInt(row.module_id) ?? moduleId,
    lesson_number: lessonNumber ?? undefined,
    lesson_code:
      typeof row.lesson_code === "string"
        ? row.lesson_code
        : formatLessonCode(moduleNumber ?? null, lessonNumber && lessonNumber > 0 ? lessonNumber : null),
    lesson_type: typeof row.lesson_type === "string" ? row.lesson_type : undefined,
    title: String(row.title ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    source: SOURCE,
    materials: hasMaterials || hasTests ? [...materials, ...tests] : undefined,
  };
}

function isActiveLesson(lesson: QualificationLesson) {
  if (!lesson.id) return false;
  return !isRemovedLessonRecord(lesson as unknown as Record<string, unknown>);
}

function isActiveModule(qualModule: QualificationModule) {
  if (!qualModule.id) return false;
  return !isRemovedModuleRecord(qualModule as unknown as Record<string, unknown>);
}

function mapModule(data: unknown, directionId?: number): QualificationModule {
  const row = asRecord(unwrapApiPayload(data));
  const id = parsePositiveInt(row.id) ?? parsePositiveInt(row.module_id) ?? 0;
  const moduleNumber = parseSignedInt(row.module_number) ?? parseSignedInt(row.sort_order) ?? undefined;
  return {
    id,
    direction_id: parsePositiveInt(row.direction_id) ?? directionId,
    module_number: moduleNumber ?? undefined,
    title: String(row.title ?? row.name ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    source: SOURCE,
    lessons: Array.isArray(row.lessons)
      ? row.lessons.map((item) => mapLesson(item, id, moduleNumber)).filter(isActiveLesson)
      : undefined,
  };
}

function parseModuleRows(data: unknown, directionId: number): QualificationModule[] {
  const inner = unwrapApiPayload(data);
  let raw: unknown[] = [];
  if (Array.isArray(inner)) {
    raw = inner;
  } else {
    const row = asRecord(inner);
    raw = asList<unknown>(row, ["modules", "items", "data"]);
    if (!raw.length && (parsePositiveInt(row.id) || parsePositiveInt(row.module_id))) {
      raw = [row];
    }
  }
  return raw
    .map((item) => mapModule(item, directionId))
    .filter(isActiveModule)
    .map((item) => ({ ...item, direction_id: item.direction_id ?? directionId }));
}

function mapDirection(data: unknown): QualificationDirection {
  const row = asRecord(unwrapApiPayload(data));
  const id = parsePositiveInt(row.id) ?? 0;
  const modules = Array.isArray(row.modules) ? parseModuleRows(row, id) : undefined;
  return {
    id,
    title: String(row.title ?? ""),
    source: SOURCE,
    category_id: parsePositiveInt(row.category_id) ?? undefined,
    category_name: typeof row.category_name === "string" ? row.category_name : undefined,
    description: typeof row.description === "string" ? row.description : undefined,
    duration_hours: parsePositiveInt(row.duration_hours) ?? undefined,
    language: typeof row.language === "string" ? row.language : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    module_count: parsePositiveInt(row.module_count) ?? modules?.length,
    modules,
  };
}

function directionBody(payload: CreateQualificationDirectionPayload) {
  return {
    title: payload.title.trim(),
    category_id: payload.category_id,
    description: payload.description?.trim() || undefined,
    duration_hours: payload.duration_hours,
    language: payload.language,
    status: payload.status,
  };
}

/** Swagger: GET /api/v1/admin/retraining-directions */
export async function getRetrainingDirections(query: RetrainingDirectionQuery = {}, silentAuth = false) {
  const data = await apiRequest<unknown>(`${B}${listQuery({ per_page: 100, ...query })}`, silentGet(silentAuth));
  const paged = asPaged<unknown>(data);
  const rows = paged.items.length ? paged.items : asList<unknown>(data, ["items", "directions"]);
  return rows.map(mapDirection).filter((item) => item.id > 0);
}

/** Swagger: GET /api/v1/admin/retraining-directions/{id}/modules */
export async function getRetrainingDirectionModules(directionId: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`${B}/${directionId}/modules`, silentGet(silentAuth));
  return parseModuleRows(data, directionId);
}

/** Swagger: GET /api/v1/admin/retraining-directions/{id} — modul/dars/material bilan. */
export async function getRetrainingDirection(
  id: number,
  silentAuth = false,
  options?: { fetchMaterials?: boolean }
): Promise<QualificationDirection> {
  const direction = mapDirection(await apiRequest<unknown>(`${B}/${id}`, silentGet(silentAuth)));
  const fetchMaterials = options?.fetchMaterials !== false;

  let modules = (direction.modules ?? []).filter(isActiveModule);
  if (!modules.length) {
    modules = await getRetrainingDirectionModules(id, silentAuth).catch(() => []);
  }

  const withLessons = await Promise.all(
    modules.map(async (item) => {
      const existing = (item.lessons ?? []).filter(isActiveLesson);
      const lessons = existing.length
        ? existing
        : await getRetrainingModuleLessons(item.id, item.module_number, silentAuth).catch(() => []);

      if (!fetchMaterials) return { ...item, lessons };

      const withMaterials = await Promise.all(
        lessons.map(async (lesson) => {
          // lessons[] ichida materials[] kelsa — qayta so'rov shart emas.
          if (lesson.materials !== undefined) return lesson;
          const materials = await getRetrainingLessonMaterials(lesson.id, silentAuth).catch(() => []);
          return { ...lesson, materials };
        })
      );
      return { ...item, lessons: withMaterials };
    })
  );

  return { ...direction, id: direction.id || id, source: SOURCE, modules: withLessons };
}

/** Swagger: POST /api/v1/admin/retraining-directions */
export async function createRetrainingDirection(payload: CreateQualificationDirectionPayload) {
  const created = await apiRequest<unknown>(B, {
    method: "POST",
    body: JSON.stringify(directionBody(payload)),
  });
  const mapped = mapDirection(created);
  return {
    ...mapped,
    id: mapped.id || pickEntityId(created) || 0,
    title: mapped.title || payload.title,
    category_id: mapped.category_id ?? payload.category_id,
    status: mapped.status || payload.status,
    source: SOURCE,
  } satisfies QualificationDirection;
}

/** Swagger: PATCH /api/v1/admin/retraining-directions/{id} */
export async function updateRetrainingDirection(id: number, payload: CreateQualificationDirectionPayload) {
  const updated = await apiRequest<unknown>(`${B}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(directionBody(payload)),
  });
  const mapped = mapDirection(updated);
  return {
    ...mapped,
    id: mapped.id || id,
    title: mapped.title || payload.title,
    category_id: mapped.category_id ?? payload.category_id,
    status: mapped.status || payload.status,
    source: SOURCE,
  } satisfies QualificationDirection;
}

/** Swagger: DELETE /api/v1/admin/retraining-directions/{id} */
export async function deleteRetrainingDirection(id: number) {
  try {
    return await apiRequest<unknown>(`${B}/${id}`, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 410)) return null;
    try {
      return await apiRequest<unknown>(`${B}/${id}?force=true`, { method: "DELETE" });
    } catch {
      throw error instanceof ApiError ? error : new ApiError(400, "Yo'nalish o'chirilmadi");
    }
  }
}

/** Swagger: POST /api/v1/admin/retraining-directions/{id}/modules */
export async function createRetrainingModule(
  directionId: number,
  payload: CreateQualificationModulePayload,
  meta?: RequestMeta
) {
  const created = await apiRequest<unknown>(`${B}/${directionId}/modules`, {
    method: "POST",
    headers: jsonHeaders(meta),
    body: JSON.stringify({
      module_number: payload.module_number,
      title: payload.title.trim(),
      sort_order: payload.module_number,
      ...(payload.status ? { status: payload.status } : {}),
    }),
  });
  const mapped = mapModule(created, directionId);
  const id = mapped.id || pickEntityId(created, ["id", "module_id"]) || 0;
  if (!id) throw new ApiError(500, "Modul ID qaytmadi");
  return {
    ...mapped,
    id,
    direction_id: directionId,
    module_number: mapped.module_number ?? payload.module_number,
    title: mapped.title || payload.title.trim(),
    source: SOURCE,
  } satisfies QualificationModule;
}

/** Umumiy admin endpoint: PATCH /api/v1/admin/modules/{id} */
export async function updateRetrainingModule(id: number, payload: CreateQualificationModulePayload) {
  const updated = await updateQualificationModule(id, payload);
  return { ...updated, source: SOURCE } satisfies QualificationModule;
}

/** Umumiy admin endpoint: GET /api/v1/admin/modules/{id}/lessons */
export async function getRetrainingModuleLessons(moduleId: number, moduleNumber?: number, silentAuth = false) {
  const lessons = await getQualificationLessons(moduleId, moduleNumber, silentAuth);
  return lessons.filter(isActiveLesson).map((lesson) => ({ ...lesson, source: SOURCE }));
}

/** Umumiy admin endpoint: POST /api/v1/admin/modules/{id}/lessons */
export async function createRetrainingLesson(
  moduleId: number,
  payload: CreateQualificationLessonPayload,
  meta?: RequestMeta
) {
  const created = await createQualificationLesson(moduleId, payload, meta);
  return { ...created, source: SOURCE } satisfies QualificationLesson;
}

/** Umumiy admin endpoint: PATCH /api/v1/admin/lessons/{id} */
export async function updateRetrainingLesson(
  id: number,
  payload: CreateQualificationLessonPayload & { status?: string }
) {
  const updated = await updateQualificationLesson(id, payload);
  return { ...updated, source: SOURCE } satisfies QualificationLesson;
}

/** Umumiy admin endpoint: GET /api/v1/admin/lessons/{id}/materials (+ /tests) */
export async function getRetrainingLessonMaterials(lessonId: number, silentAuth = false) {
  const [materials, tests] = await Promise.all([
    getQualificationMaterials(lessonId, silentAuth),
    getQualificationTests(lessonId, silentAuth).catch(() => [] as QualificationMaterial[]),
  ]);
  return [...materials, ...tests].map((item) => ({ ...item, source: SOURCE }));
}

export async function deleteRetrainingModule(id: number) {
  return deleteQualificationModule(id);
}

export async function deleteRetrainingLesson(id: number) {
  return deleteQualificationLesson(id);
}

export async function deleteRetrainingMaterial(id: number) {
  return deleteQualificationMaterial(id);
}

/** Dars holati/nashri — umumiy admin endpointlari. */
export {
  publishLesson as publishRetrainingLesson,
  saveLessonDraft as saveRetrainingLessonDraft,
  setLessonStatus as setRetrainingLessonStatus,
  setModuleStatus as setRetrainingModuleStatus,
  submitLessonMaterial as submitRetrainingLessonMaterial,
  uploadAdminFile,
} from "@/lib/api/qualification";
