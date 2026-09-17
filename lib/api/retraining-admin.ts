/**
 * Qayta tayyorlash admin API — canonical `/api/v1/admin/retraining/{panel}/...`
 * Proxy: `/backend` + path → `http://localhost:3000/backend/api/v1/admin/retraining/{panel}`
 */
import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import {
  createItLessonTestWithQuestions,
  deleteItLesson,
  updateItLesson,
} from "@/lib/api/admin-it";
import { ApiError, FORBIDDEN_ACTION_MESSAGE, isAuthorizationError, isDataConstraintError, isForceDeleteEligible } from "@/lib/api/errors";
import { pickFileUrl } from "@/lib/api/media";
import { pickDirectionThumbnail } from "@/lib/qualification/direction-image";
import { uploadAdminFile } from "@/lib/api/qualification";
import type { UploadOptions } from "@/lib/api/upload";
import type {
  CreateQualificationDirectionPayload,
  CreateQualificationLessonPayload,
  CreateQualificationModulePayload,
  MaterialFormData,
  QualificationDirection,
  QualificationLesson,
  QualificationMaterial,
  QualificationModule,
} from "@/lib/api/types/qualification";
import { asList, asPaged, parsePositiveInt, parseSignedInt, pickEntityId, unwrapApiPayload } from "@/lib/api/unwrap";
import { isRemovedLessonRecord, isRemovedModuleRecord } from "@/lib/publish-status";
import { formatLessonCode } from "@/lib/qualification/constants";
import {
  getRetrainingPanelConfig,
  panelFromRetrainingType,
  resolveRetrainingPanel,
  type RetrainingPanel,
} from "@/lib/retraining/admin-panels";
import {
  API_RETRAINING_MATERIAL_TYPES,
  isLegacyLessonMaterialDbType,
  LEGACY_LESSON_MATERIAL_DB_TYPES,
  normalizeMaterialType,
  retrainingMaterialFileError,
  retrainingMaterialNeedsFile,
  type RetrainingMaterialType,
} from "@/lib/retraining/material-types";
import {
  getModuleBlockId,
  parseBlockMeta,
  resolveBlocksForDirection,
  serializeBlockMeta,
  stripBlockMeta,
  stripModuleBlockMarker,
  type RetrainingBlock,
  withModuleBlockMarker,
} from "@/lib/retraining/content-blocks";
import { getAuthUser } from "@/lib/auth/session";
import { canAccessIt } from "@/lib/auth/roles";
import { upsertRetrainingDirectionThumbs, removeRetrainingDirectionThumb, replaceRetrainingPanelSnapshot } from "@/lib/retraining/direction-snapshot";

const IT = "/admin/it";
const RETRAINING_ADMIN = "/api/v1/admin/retraining";
const ADMIN_MATERIALS = "/api/v1/admin/materials";
const SOURCE = "retraining" as const;

export type RetrainingRequestContext = {
  direction?: QualificationDirection | null;
};

/** Route `{panel}` + yo'nalish `retraining_type`; direction ustun, umumiy fallback yo'q. */
export function requireRetrainingPanel(
  routePanel: RetrainingPanel,
  direction?: QualificationDirection | null
): RetrainingPanel {
  const resolved = resolveRetrainingPanel({ routePanel, direction });
  if (!resolved) {
    throw new ApiError(
      400,
      "Qayta tayyorlash paneli aniqlanmadi. URL /admin/software/retraining/{umumiy|pedagogik|kasbiy} kerak."
    );
  }
  if (
    process.env.NODE_ENV === "development" &&
    direction?.retraining_type &&
    routePanel !== resolved
  ) {
    console.warn("[retraining-admin] API panel yo'nalish retraining_type bo'yicha tuzatildi", {
      routePanel,
      effectivePanel: resolved,
      directionId: direction.id,
      retraining_type: direction.retraining_type,
    });
  }
  return resolved;
}

export type RetrainingDirectionQuery = {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
  category_id?: number;
};

export type RetrainingDirectionsPage = {
  items: QualificationDirection[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type CreateRetrainingMaterialPayload = {
  type: RetrainingMaterialType | string;
  title: string;
  description?: string;
  file_id?: number;
  sort_order?: number;
};

type RequestMeta = {
  idempotencyKey?: string;
};

function retrainingPanelRoot(panel: RetrainingPanel) {
  return `${RETRAINING_ADMIN}/${panel}`;
}

function directionPath(panel: RetrainingPanel, directionId?: number) {
  const base = retrainingPanelRoot(panel);
  return directionId ? `${base}/${directionId}` : base;
}

function directionModulesPath(panel: RetrainingPanel, directionId: number) {
  return `${retrainingPanelRoot(panel)}/${directionId}/modules`;
}

function modulePath(panel: RetrainingPanel, moduleId: number) {
  return `${retrainingPanelRoot(panel)}/modules/${moduleId}`;
}

function moduleLessonsPath(panel: RetrainingPanel, moduleId: number) {
  return `${modulePath(panel, moduleId)}/lessons`;
}

function moduleWriteBody(payload: CreateQualificationModulePayload) {
  const body: Record<string, unknown> = {
    title: payload.title.trim(),
  };
  if (payload.module_number != null) {
    body.module_number = payload.module_number;
    body.sort_order = payload.module_number;
  }
  if (payload.description !== undefined) body.description = payload.description.trim();
  if (payload.status) body.status = payload.status;
  return body;
}

/** PATCH, 405 bo'lsa PUT — ikkala route ham backendda bor. */
async function mutateRetrainingModule(path: string, body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  try {
    return await retrainingApi<unknown>(path, { method: "PATCH", body: payload });
  } catch (error) {
    if (error instanceof ApiError && error.status === 405) {
      return retrainingApi<unknown>(path, { method: "PUT", body: payload });
    }
    throw error;
  }
}

function lessonMaterialsPath(panel: RetrainingPanel, lessonId: number) {
  return `${retrainingPanelRoot(panel)}/lessons/${lessonId}/materials`;
}

function lessonPublishPath(panel: RetrainingPanel, lessonId: number) {
  return `${retrainingPanelRoot(panel)}/lessons/${lessonId}/publish`;
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function silentGet(silentAuth?: boolean): ApiRequestOptions {
  return silentAuth ? { skipAuthRedirect: true } : {};
}

function assertItRetrainingAccess() {
  if (typeof window === "undefined") return;
  if (!canAccessIt(getAuthUser()?.role)) {
    throw new ApiError(403, FORBIDDEN_ACTION_MESSAGE);
  }
}

async function retrainingApi<T>(path: string, options?: ApiRequestOptions, auth = true): Promise<T> {
  assertItRetrainingAccess();
  return apiRequest<T>(path, options, auth);
}

function jsonHeaders(meta?: RequestMeta): HeadersInit | undefined {
  if (!meta?.idempotencyKey) return undefined;
  return { "Idempotency-Key": meta.idempotencyKey };
}

function listQuery(query: RetrainingDirectionQuery = {}, panel?: RetrainingPanel) {
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

function looksLikeDirectionRecord(row: Record<string, unknown>): boolean {
  if (typeof row.retraining_type === "string" || typeof row.retrainingType === "string") return true;
  if (Array.isArray(row.modules)) return true;
  if (parsePositiveInt(row.direction_id) && row.module_number == null && row.sort_order == null) return true;
  return false;
}

function readModuleRowId(row: Record<string, unknown>, directionId?: number): number {
  const moduleIdField = parsePositiveInt(row.module_id);
  if (moduleIdField) return moduleIdField;
  const id = parsePositiveInt(row.id) ?? 0;
  if (!id) return 0;
  if (directionId && id === directionId && looksLikeDirectionRecord(row)) return 0;
  if (looksLikeDirectionRecord(row) && row.module_number == null && row.sort_order == null) return 0;
  return id;
}

/** Modul create response — yo'nalish `id` ni modul PK deb olmasin. */
function extractModulePrimaryKey(data: unknown, directionId?: number): number {
  const root = asRecord(data);
  for (const key of ["module", "item"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      const id = readModuleRowId(asRecord(nested), directionId);
      if (id) return id;
    }
  }
  const unwrapped = asRecord(unwrapApiPayload(data));
  const id = readModuleRowId(unwrapped, directionId);
  if (id) return id;
  if (directionId && parsePositiveInt(unwrapped.id) === directionId && Array.isArray(unwrapped.modules)) {
    const first = unwrapped.modules[0];
    if (first && typeof first === "object") {
      const nestedId = readModuleRowId(first as Record<string, unknown>, directionId);
      if (nestedId) return nestedId;
    }
  }
  return pickEntityId(data, ["module_id"]) ?? 0;
}

function mapModule(data: unknown, directionId?: number): QualificationModule {
  const row = asRecord(unwrapApiPayload(data));
  const id = readModuleRowId(row, directionId);
  const moduleNumber = parseSignedInt(row.module_number) ?? parseSignedInt(row.sort_order) ?? undefined;
  return {
    id,
    direction_id: parsePositiveInt(row.direction_id) ?? directionId,
    module_number: moduleNumber ?? undefined,
    title: String(row.title ?? row.name ?? ""),
    description: typeof row.description === "string" ? row.description : undefined,
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
    if (!raw.length) {
      const moduleIdField = parsePositiveInt(row.module_id);
      const rowId = parsePositiveInt(row.id);
      const hasModuleShape =
        Boolean(moduleIdField) ||
        (Boolean(rowId) &&
          (row.module_number != null || row.sort_order != null) &&
          !looksLikeDirectionRecord(row));
      if (hasModuleShape) raw = [row];
    }
  }
  return raw
    .map((item) => mapModule(item, directionId))
    .filter(isActiveModule)
    .map((item) => ({ ...item, direction_id: item.direction_id ?? directionId }));
}

function mapDirection(data: unknown, panel?: RetrainingPanel): QualificationDirection {
  const row = asRecord(unwrapApiPayload(data));
  const id =
    parsePositiveInt(row.id) ??
    parsePositiveInt(row.direction_id) ??
    pickEntityId(data, ["id", "direction_id"]) ??
    0;
  const modules = Array.isArray(row.modules) ? parseModuleRows(row, id) : undefined;
  const retrainingType =
    typeof row.retraining_type === "string"
      ? row.retraining_type
      : typeof row.retrainingType === "string"
        ? row.retrainingType
        : undefined;
  const resolvedPanel = panel ?? panelFromRetrainingType(retrainingType);
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
    retraining_panel: resolvedPanel,
    retraining_type: retrainingType ?? (resolvedPanel ? getRetrainingPanelConfig(resolvedPanel).type : undefined),
    kind: typeof row.kind === "string" ? row.kind : "QAYTA_TAYYORLASH",
    thumbnail_url: pickDirectionThumbnail(row),
    image_file_id: parsePositiveInt(row.image_file_id) ?? parsePositiveInt(row.file_id) ?? undefined,
  };
}

function directionBody(payload: CreateQualificationDirectionPayload) {
  return {
    title: payload.title.trim(),
    ...(payload.category_id ? { category_id: payload.category_id } : {}),
    description: payload.description?.trim() || undefined,
    duration_hours: payload.duration_hours,
    language: payload.language,
    status: payload.status,
    ...(payload.thumbnail_url ? { thumbnail_url: payload.thumbnail_url } : {}),
    ...(payload.image_url || payload.thumbnail_url
      ? { image_url: payload.image_url || payload.thumbnail_url }
      : {}),
    ...(payload.file_id ? { file_id: payload.file_id } : {}),
  };
}

function withPanel(direction: QualificationDirection, panel: RetrainingPanel): QualificationDirection {
  const fromApiType = panelFromRetrainingType(direction.retraining_type);
  const effectivePanel = fromApiType ?? direction.retraining_panel ?? panel;
  const effectiveType =
    direction.retraining_type ?? getRetrainingPanelConfig(effectivePanel).type;
  return {
    ...direction,
    source: SOURCE,
    retraining_panel: effectivePanel,
    retraining_type: effectiveType,
    kind: direction.kind ?? "QAYTA_TAYYORLASH",
  };
}

function parseLessonRows(data: unknown, moduleId: number, moduleNumber?: number): QualificationLesson[] {
  const inner = unwrapApiPayload(data);
  let raw: unknown[] = [];
  if (Array.isArray(inner)) {
    raw = inner;
  } else {
    const row = asRecord(inner);
    raw = asList<unknown>(row, ["lessons", "items", "data"]);
    if (!raw.length && parsePositiveInt(row.id)) raw = [row];
  }
  return raw
    .map((item) => mapLesson(item, moduleId, moduleNumber))
    .filter(isActiveLesson)
    .map((item) => ({ ...item, module_id: item.module_id ?? moduleId, source: SOURCE }));
}

// ─── Yo'nalish ───────────────────────────────────────────────────────────────

export async function getRetrainingDirectionsPage(
  panel: RetrainingPanel,
  query: RetrainingDirectionQuery = {},
  silentAuth = false
): Promise<RetrainingDirectionsPage> {
  const data = await retrainingApi<unknown>(
    `${directionPath(panel)}${listQuery(query)}`,
    silentGet(silentAuth)
  );
  const paged = asPaged<unknown>(data);
  const rows = paged.items.length ? paged.items : asList<unknown>(data, ["items", "directions"]);
  const items = rows
    .map((item) => withPanel(mapDirection(item, panel), panel))
    .filter((item) => {
      if (!(item.id > 0)) return false;
      const itemPanel = panelFromRetrainingType(item.retraining_type);
      return !itemPanel || itemPanel === panel;
    });
  return {
    items,
    total: paged.total,
    page: paged.page,
    per_page: paged.per_page,
    total_pages: paged.total_pages,
  };
}

export async function getRetrainingDirections(
  panel: RetrainingPanel,
  query: RetrainingDirectionQuery = {},
  silentAuth = false
) {
  const first = await getRetrainingDirectionsPage(panel, { per_page: 100, ...query }, silentAuth);
  const items =
    first.total_pages <= 1
      ? first.items
      : await Promise.all(
          Array.from({ length: first.total_pages - 1 }, (_, index) =>
            getRetrainingDirectionsPage(panel, { ...query, page: index + 2, per_page: first.per_page }, silentAuth)
          )
        ).then((rest) => rest.reduce((acc, page) => acc.concat(page.items), first.items));
  void replaceRetrainingPanelSnapshot(panel, items);
  return items;
}

export async function getRetrainingDirectionRecord(
  panel: RetrainingPanel,
  id: number,
  silentAuth = false
) {
  const direction = withPanel(
    mapDirection(await retrainingApi<unknown>(directionPath(panel, id), silentGet(silentAuth)), panel),
    panel
  );
  void upsertRetrainingDirectionThumbs([direction]);
  return direction;
}

export async function getRetrainingDirection(
  panel: RetrainingPanel,
  id: number,
  silentAuth = false,
  options?: { fetchMaterials?: boolean }
): Promise<QualificationDirection> {
  const direction = await getRetrainingDirectionRecord(panel, id, silentAuth);
  const fetchMaterials = options?.fetchMaterials === true;

  const embeddedModules = (direction.modules ?? []).filter(isActiveModule);
  const modulesFromApi =
    embeddedModules.length > 0
      ? embeddedModules
      : await getRetrainingDirectionModules(panel, id, silentAuth).catch(() => []);

  const modules = modulesFromApi.length > 0 ? modulesFromApi : embeddedModules;

  const normalizedModules = modules.map((item) => ({
    ...item,
    lessons: item.lessons !== undefined ? item.lessons.filter(isActiveLesson) : undefined,
  }));

  if (!fetchMaterials) {
    const next = { ...direction, id: direction.id || id, modules: normalizedModules };
    void upsertRetrainingDirectionThumbs([next], { notify: true });
    return next;
  }

  const withMaterials = await Promise.all(
    normalizedModules.map(async (item) => {
      const lessons = await Promise.all(
        (item.lessons ?? []).map(async (lesson) => {
          if (lesson.materials !== undefined) return lesson;
          const materials = await getRetrainingLessonMaterials(panel, lesson.id, silentAuth).catch(() => []);
          return { ...lesson, materials };
        })
      );
      return { ...item, lessons };
    })
  );

  const next = { ...direction, id: direction.id || id, modules: withMaterials };
  void upsertRetrainingDirectionThumbs([next], { notify: true });
  return next;
}

/** Modul darslari 404/400 bo'lsa yo'nalish yuklanishini to'xtatmaydi (backend: "modul topilmadi"). */
export async function getRetrainingModuleLessonsSafe(
  routePanel: RetrainingPanel,
  moduleId: number,
  moduleNumber?: number,
  silentAuth = false,
  context?: RetrainingRequestContext
): Promise<QualificationLesson[]> {
  try {
    return await getRetrainingModuleLessons(routePanel, moduleId, moduleNumber, silentAuth, context);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[retraining-admin] module lessons skipped", {
          panel: routePanel,
          moduleId,
          status: error.status,
          message: error instanceof ApiError ? error.message : String(error),
        });
      }
      return [];
    }
    throw error;
  }
}

async function refreshSavedDirection(
  panel: RetrainingPanel,
  fallback: QualificationDirection
): Promise<QualificationDirection> {
  if (!(fallback.id > 0)) return fallback;
  try {
    const fresh = await getRetrainingDirectionRecord(panel, fallback.id);
    const next = {
      ...fallback,
      ...fresh,
      thumbnail_url: fresh.thumbnail_url || fallback.thumbnail_url,
    } satisfies QualificationDirection;
    void upsertRetrainingDirectionThumbs([next], { notify: true });
    return next;
  } catch {
    void upsertRetrainingDirectionThumbs([fallback], { notify: true });
    return fallback;
  }
}

export async function createRetrainingDirection(panel: RetrainingPanel, payload: CreateQualificationDirectionPayload) {
  const created = await retrainingApi<unknown>(directionPath(panel), {
    method: "POST",
    body: JSON.stringify(directionBody(payload)),
  });
  const mapped = withPanel(mapDirection(created, panel), panel);
  return refreshSavedDirection(panel, {
    ...mapped,
    id: mapped.id || pickEntityId(created, ["id", "direction_id"]) || 0,
    title: mapped.title || payload.title,
    category_id: mapped.category_id ?? payload.category_id,
    status: mapped.status || payload.status,
    thumbnail_url: mapped.thumbnail_url || payload.thumbnail_url,
  });
}

export async function updateRetrainingDirection(
  panel: RetrainingPanel,
  id: number,
  payload: CreateQualificationDirectionPayload
) {
  const updated = await retrainingApi<unknown>(directionPath(panel, id), {
    method: "PATCH",
    body: JSON.stringify(directionBody(payload)),
  });
  const mapped = withPanel(mapDirection(updated, panel), panel);
  return refreshSavedDirection(panel, {
    ...mapped,
    id: mapped.id || id,
    title: mapped.title || payload.title,
    category_id: mapped.category_id ?? payload.category_id,
    status: mapped.status || payload.status,
    thumbnail_url: mapped.thumbnail_url || payload.thumbnail_url,
  });
}

export async function deleteRetrainingDirection(panel: RetrainingPanel, id: number) {
  try {
    const result = await retrainingApi<unknown>(directionPath(panel, id), { method: "DELETE" });
    void removeRetrainingDirectionThumb(id);
    return result;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 410)) {
      void removeRetrainingDirectionThumb(id);
      return null;
    }
    if (isAuthorizationError(error)) {
      throw new ApiError(error.status, FORBIDDEN_ACTION_MESSAGE, error.raw);
    }
    if (!isForceDeleteEligible(error)) {
      throw error instanceof ApiError ? error : new ApiError(400, "Yo'nalish o'chirilmadi");
    }
    try {
      const result = await retrainingApi<unknown>(`${directionPath(panel, id)}?force=true`, { method: "DELETE" });
      void removeRetrainingDirectionThumb(id);
      return result;
    } catch (forceError) {
      if (isAuthorizationError(forceError)) {
        throw new ApiError(forceError.status, FORBIDDEN_ACTION_MESSAGE, forceError.raw);
      }
      throw error instanceof ApiError ? error : new ApiError(400, "Yo'nalish o'chirilmadi");
    }
  }
}

// ─── Modul ───────────────────────────────────────────────────────────────────

export async function getRetrainingDirectionModules(panel: RetrainingPanel, directionId: number, silentAuth = false) {
  const data = await retrainingApi<unknown>(directionModulesPath(panel, directionId), silentGet(silentAuth));
  return parseModuleRows(data, directionId);
}

export async function createRetrainingModule(
  routePanel: RetrainingPanel,
  directionId: number,
  payload: CreateQualificationModulePayload,
  meta?: RequestMeta,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  const created = await retrainingApi<unknown>(directionModulesPath(panel, directionId), {
    method: "POST",
    headers: jsonHeaders(meta),
    body: JSON.stringify({
      module_number: payload.module_number,
      title: payload.title.trim(),
      description: payload.description?.trim() || "",
      sort_order: payload.module_number,
      status: payload.status ?? "DRAFT",
    }),
  });
  const mapped = mapModule(created, directionId);
  const id = mapped.id || extractModulePrimaryKey(created, directionId) || 0;
  if (!id) throw new ApiError(500, "Modul ID qaytmadi — backend response ichida module.id topilmadi");
  return {
    ...mapped,
    id,
    direction_id: directionId,
    module_number: mapped.module_number ?? payload.module_number,
    title: mapped.title || payload.title.trim(),
    description: mapped.description ?? payload.description,
    source: SOURCE,
  } satisfies QualificationModule;
}

/** PATCH/PUT /api/v1/admin/retraining/{panel}/modules/{moduleId} */
export async function updateRetrainingModule(
  routePanel: RetrainingPanel,
  id: number,
  payload: CreateQualificationModulePayload,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  const updated = await mutateRetrainingModule(modulePath(panel, id), moduleWriteBody(payload));
  const mapped = mapModule(updated);
  return {
    ...mapped,
    id: mapped.id || id,
    module_number: mapped.module_number ?? payload.module_number,
    title: mapped.title || payload.title.trim(),
    description: payload.description ?? mapped.description,
    source: SOURCE,
  } satisfies QualificationModule;
}

/** DELETE /api/v1/admin/retraining/{panel}/modules/{moduleId} */
export async function deleteRetrainingModule(
  routePanel: RetrainingPanel,
  id: number,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  const path = modulePath(panel, id);
  try {
    return await retrainingApi<unknown>(path, { method: "DELETE" });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 410)) return null;
    if (isAuthorizationError(error)) {
      throw new ApiError(error.status, FORBIDDEN_ACTION_MESSAGE, error.raw);
    }
    if (!isForceDeleteEligible(error)) {
      throw error instanceof ApiError ? error : new ApiError(400, "Modul o'chirilmadi");
    }
    try {
      return await retrainingApi<unknown>(`${path}?force=true`, { method: "DELETE" });
    } catch (forceError) {
      if (isAuthorizationError(forceError)) {
        throw new ApiError(forceError.status, FORBIDDEN_ACTION_MESSAGE, forceError.raw);
      }
      throw error instanceof ApiError ? error : new ApiError(400, "Modul o'chirilmadi");
    }
  }
}

// ─── Blok (description meta — backend block API yo'q) ───────────────────────

export async function getRetrainingBlocks(panel: RetrainingPanel, directionId: number, silentAuth = false) {
  const direction = await getRetrainingDirection(panel, directionId, silentAuth, { fetchMaterials: false });
  const blocks = parseBlockMeta(direction.description);
  return blocks.length ? blocks : [{ id: 1, block_number: 1, title: "Asosiy blok" }];
}

export async function saveRetrainingBlocks(
  panel: RetrainingPanel,
  directionId: number,
  blocks: RetrainingBlock[],
  humanDescription?: string | null
) {
  const current = await getRetrainingDirectionRecord(panel, directionId);
  const description = serializeBlockMeta(blocks, humanDescription ?? stripBlockMeta(current.description));
  const saved = await updateRetrainingDirection(panel, directionId, {
    title: current.title,
    category_id: current.category_id,
    description,
    duration_hours: current.duration_hours,
    language: current.language,
    status: current.status,
  });
  const { invalidateLearningCache } = await import("@/lib/api/learning");
  invalidateLearningCache(directionId);
  return saved;
}

/** PATCH yo'nalish description (ZM_BLOCKS) — swaggerda alohida /blocks endpoint yo'q. */
export async function updateRetrainingBlock(
  panel: RetrainingPanel,
  directionId: number,
  block: RetrainingBlock,
  title: string
) {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new ApiError(400, "Blok nomi majburiy");
  }
  const direction = await getRetrainingDirection(panel, directionId, false, { fetchMaterials: false });
  const existing = resolveBlocksForDirection(direction);
  if (!existing.some((item) => item.id === block.id)) {
    throw new ApiError(404, "Blok topilmadi");
  }
  const next = existing.map((item) => (item.id === block.id ? { ...item, title: trimmed } : item));
  return saveRetrainingBlocks(panel, directionId, next, direction.description);
}

/** DELETE blok — remaining ZM_BLOCKS PATCH + modul marker tozalash. */
export async function deleteRetrainingBlock(
  panel: RetrainingPanel,
  directionId: number,
  blockId: number
) {
  const direction = await getRetrainingDirection(panel, directionId, false, { fetchMaterials: false });
  const existing = resolveBlocksForDirection(direction);
  const next = existing.filter((item) => item.id !== blockId);
  if (next.length === existing.length) {
    throw new ApiError(404, "Blok topilmadi");
  }
  const saved = await saveRetrainingBlocks(panel, directionId, next, direction.description);
  const marked = (direction.modules ?? []).filter((item) => getModuleBlockId(item) === blockId);
  for (const qualModule of marked) {
    try {
      await updateRetrainingModule(
        panel,
        qualModule.id,
        {
          module_number: qualModule.module_number ?? 1,
          title: qualModule.title,
          status: qualModule.status,
          description: stripModuleBlockMarker(qualModule.description),
        },
        { direction: saved }
      );
    } catch {
      /* blok description'dan o'chirilgan; marker qolsa unassigned ga tushadi */
    }
  }
  return saved;
}

export async function assignRetrainingModuleBlock(
  panel: RetrainingPanel,
  qualModule: QualificationModule,
  blockId: number
) {
  const description = withModuleBlockMarker(qualModule.description, blockId);
  return updateRetrainingModule(
    panel,
    qualModule.id,
    {
      module_number: qualModule.module_number ?? 1,
      title: qualModule.title,
      status: qualModule.status,
      description,
    }
  );
}

// ─── Dars ────────────────────────────────────────────────────────────────────

function retrainingItLessonType(lessonType?: string | null) {
  const key = (lessonType ?? "").trim().toLowerCase();
  if (key === "video") return "video";
  if (key === "presentation") return "presentation";
  if (key === "test") return "test";
  return "guide";
}

/** GET /admin/retraining/{panel}/modules/{moduleId}/lessons — malaka `/admin/modules/*` emas. */
export async function getRetrainingModuleLessons(
  routePanel: RetrainingPanel,
  moduleId: number,
  moduleNumber?: number,
  silentAuth = false,
  context?: RetrainingRequestContext
) {
  if (!moduleId) return [];
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  const data = await retrainingApi<unknown>(moduleLessonsPath(panel, moduleId), {
    ...silentGet(silentAuth),
    suppressErrorLog: true,
  });
  return parseLessonRows(data, moduleId, moduleNumber);
}

/** GET /admin/it/lessons/{id} — swaggerda faqat PUT/DELETE, lekin backend GET qaytaradi. */
export async function getRetrainingLesson(lessonId: number, silentAuth = false) {
  try {
    const data = await retrainingApi<unknown>(`${IT}/lessons/${lessonId}`, silentGet(silentAuth));
    const mapped = mapLesson(data);
    if (!mapped.id) return null;
    return { ...mapped, id: mapped.id, source: SOURCE } satisfies QualificationLesson;
  } catch {
    return null;
  }
}

/** POST /admin/retraining/{panel}/modules/{moduleId}/lessons */
export async function createRetrainingLesson(
  routePanel: RetrainingPanel,
  moduleId: number,
  payload: CreateQualificationLessonPayload,
  meta?: RequestMeta,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  const order = payload.lesson_number ?? 1;
  const created = await retrainingApi<unknown>(moduleLessonsPath(panel, moduleId), {
    method: "POST",
    headers: jsonHeaders(meta),
    body: JSON.stringify({
      title: payload.title.trim(),
      lesson_number: order,
      lesson_type: retrainingItLessonType(payload.lesson_type),
      sort_order: order,
      status: payload.status ?? "DRAFT",
    }),
  });
  const mapped = mapLesson(created, moduleId, payload.module_number ?? order);
  const id = mapped.id || pickEntityId(created) || 0;
  if (!id) throw new ApiError(500, "Dars ID qaytmadi");
  return { ...mapped, id, module_id: moduleId, source: SOURCE } satisfies QualificationLesson;
}

export async function updateRetrainingLesson(
  id: number,
  payload: CreateQualificationLessonPayload & { status?: string }
) {
  const order = payload.lesson_number ?? 1;
  const updated = await updateItLesson(id, {
    title: payload.title.trim(),
    item_type: "lesson",
    lesson_type: retrainingItLessonType(payload.lesson_type),
    order_index: order,
  });
  const mapped = mapLesson(updated, payload.module_id, payload.module_number ?? order);
  return {
    ...mapped,
    id,
    module_id: mapped.module_id ?? payload.module_id,
    source: SOURCE,
    status: payload.status ?? mapped.status,
  } satisfies QualificationLesson;
}

export async function deleteRetrainingLesson(id: number) {
  assertItRetrainingAccess();
  return deleteItLesson(id);
}

// ─── Material ────────────────────────────────────────────────────────────────

/** GET /api/v1/admin/retraining/{panel}/lessons/{lessonId}/materials */
export async function getRetrainingLessonMaterials(
  routePanel: RetrainingPanel,
  lessonId: number,
  silentAuth = false,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  try {
    const data = await retrainingApi<unknown>(lessonMaterialsPath(panel, lessonId), silentGet(silentAuth));
    return asList<unknown>(data, ["items", "materials"])
      .map(mapMaterial)
      .filter((item) => item.id > 0 || item.type === "TEST")
      .map((item) => ({ ...item, lesson_id: item.lesson_id ?? lessonId }));
  } catch {
    return [];
  }
}

/** POST /api/v1/admin/retraining/{panel}/lessons/{lessonId}/materials */
export async function createRetrainingMaterial(
  routePanel: RetrainingPanel,
  lessonId: number,
  payload: CreateRetrainingMaterialPayload,
  _fileUrl?: string,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  if (
    process.env.NODE_ENV === "development" &&
    context?.direction?.retraining_type &&
    routePanel !== panel
  ) {
    console.warn("[retraining-admin] createRetrainingMaterial panel corrected", {
      routePanel,
      effectivePanel: panel,
      lessonId,
      retraining_type: context.direction.retraining_type,
    });
  }
  const normalizedType = normalizeMaterialType(payload.type, "retraining");
  if (!normalizedType) {
    throw new ApiError(400, `Material turi noto'g'ri: ${String(payload.type)}`);
  }
  if (process.env.NODE_ENV === "development" && String(payload.type).trim().toUpperCase() !== normalizedType) {
    console.log("[retraining-admin] material type normalized", {
      raw: payload.type,
      normalized: normalizedType,
    });
  }

  const title = payload.title.trim();
  if (!title) {
    throw new ApiError(400, "Material nomi majburiy");
  }

  const fileRequired = retrainingMaterialNeedsFile(normalizedType);
  const fileId = payload.file_id && payload.file_id > 0 ? payload.file_id : undefined;
  if (fileRequired && !fileId) {
    throw new ApiError(400, "Fayl yuklash majburiy");
  }

  const postBody: { type: string; title: string; file_id?: number; description?: string; sort_order?: number } = {
    type: normalizedType,
    title,
  };
  if (fileId) postBody.file_id = fileId;
  if (payload.description?.trim()) postBody.description = payload.description.trim();
  if (payload.sort_order != null) postBody.sort_order = payload.sort_order;

  if (process.env.NODE_ENV === "development") {
    console.log("Material payload", {
      type: postBody.type,
      title: postBody.title,
      file_id: postBody.file_id,
    });
  }

  try {
    const created = await retrainingApi<unknown>(lessonMaterialsPath(panel, lessonId), {
      method: "POST",
      body: JSON.stringify(postBody),
    });
    return mapMaterial(created);
  } catch (error) {
    if (process.env.NODE_ENV === "development" && isDataConstraintError(error)) {
      const sentType = String(postBody.type);
      console.error("[retraining-admin] lesson_materials_type_check (23514)", {
        failedType: sentType,
        frontendSent: sentType,
        rawInputType: payload.type,
        dbAllowedTypesLegacy: [...LEGACY_LESSON_MATERIAL_DB_TYPES],
        dbAllowedTypesCanonical: [...API_RETRAINING_MATERIAL_TYPES],
        matchLegacyDb: isLegacyLessonMaterialDbType(sentType) ? "YES" : "NO",
        matchCanonicalApi: API_RETRAINING_MATERIAL_TYPES.includes(sentType as RetrainingMaterialType)
          ? "YES"
          : "NO",
        rootCauseHint:
          API_RETRAINING_MATERIAL_TYPES.includes(sentType as RetrainingMaterialType) &&
          !isLegacyLessonMaterialDbType(sentType)
            ? "DATABASE — constraint LECTURE/MUSTAQIL_ISH ni qo'llamaydi"
            : "FRONTEND — type canonical emas",
      });
    }
    throw error;
  }
}

export async function updateRetrainingMaterial(
  materialId: number,
  payload: Partial<CreateRetrainingMaterialPayload>,
  _fileUrl?: string
) {
  const normalizedType = payload.type ? normalizeMaterialType(payload.type, "retraining") : null;
  const body: {
    title?: string;
    type?: string;
    description?: string;
    file_id?: number;
    sort_order?: number;
  } = {};
  if (payload.title?.trim()) body.title = payload.title.trim();
  if (normalizedType) body.type = normalizedType;
  if (payload.description?.trim()) body.description = payload.description.trim();
  if (payload.file_id != null) body.file_id = payload.file_id;
  if (payload.sort_order != null) body.sort_order = payload.sort_order;

  const updated = await retrainingApi<unknown>(`${ADMIN_MATERIALS}/${materialId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  return mapMaterial(updated);
}

/** DELETE /api/v1/admin/materials/{materialId} — panel-specific emas. */
export async function deleteRetrainingMaterial(materialId: number) {
  if (process.env.NODE_ENV === "development") {
    console.log("Deleting material", { materialId });
  }
  return retrainingApi<unknown>(`${ADMIN_MATERIALS}/${materialId}`, { method: "DELETE" });
}

/** Fayl yuklash + material yaratish (wizard/detail uchun). */
export async function submitRetrainingLessonMaterial(
  routePanel: RetrainingPanel,
  lessonId: number,
  item: MaterialFormData,
  options?: UploadOptions,
  context?: RetrainingRequestContext
) {
  requireRetrainingPanel(routePanel, context?.direction);
  const normalizedType = normalizeMaterialType(item.type, "wizard");
  if (!normalizedType) {
    throw new ApiError(400, `Material turi noto'g'ri: ${String(item.type)}`);
  }
  if (process.env.NODE_ENV === "development") {
    console.log("[retraining-admin] submitRetrainingLessonMaterial payload", {
      rawType: item.type,
      normalizedType,
      title: item.title,
      file_id: item.fileId,
      sort_order: 0,
    });
  }

  if (normalizedType === "TEST") {
    const result = await createItLessonTestWithQuestions(lessonId, item);
    return { id: result.id, type: "TEST" as const };
  }

  const fileMismatch = retrainingMaterialFileError(normalizedType, item.file ?? item.fileName);
  if (item.file && fileMismatch) {
    throw new ApiError(400, fileMismatch);
  }

  let fileId: number | undefined = item.fileId;
  if (item.file) {
    const uploaded = await uploadAdminFile(item.file, options);
    fileId = uploaded.id;
  }

  if (item.file && !fileId) {
    throw new ApiError(500, "Fayl ID qaytmadi");
  }
  if (retrainingMaterialNeedsFile(normalizedType) && !fileId && !item.serverId) {
    throw new ApiError(400, "Fayl yuklash majburiy");
  }

  if (item.serverId) {
    const updated = await updateRetrainingMaterial(item.serverId, {
      type: normalizedType,
      title: item.title.trim(),
      description: item.description,
      file_id: fileId,
    });
    return { id: updated.id, type: normalizedType, fileId };
  }

  const created = await createRetrainingMaterial(
    routePanel,
    lessonId,
    {
      type: normalizedType,
      title: item.title.trim(),
      description: item.description,
      file_id: fileId,
    },
    undefined,
    { direction: context?.direction }
  );
  return { id: created.id, type: normalizedType, fileId };
}

// ─── Nashr / holat ───────────────────────────────────────────────────────────

/** POST /api/v1/admin/retraining/{panel}/lessons/{lessonId}/publish */
export async function publishRetrainingLesson(
  routePanel: RetrainingPanel,
  lessonId: number,
  context?: RetrainingRequestContext
) {
  const panel = requireRetrainingPanel(routePanel, context?.direction);
  return retrainingApi<unknown>(lessonPublishPath(panel, lessonId), { method: "POST" });
}

export async function setRetrainingModuleStatus(
  routePanel: RetrainingPanel,
  moduleId: number,
  status: "DRAFT" | "PUBLISHED" | "INACTIVE" | "ARCHIVED",
  module?: { module_number?: number; title?: string; description?: string },
  context?: RetrainingRequestContext
) {
  return updateRetrainingModule(
    routePanel,
    moduleId,
    {
      module_number: module?.module_number ?? 1,
      title: module?.title?.trim() || "",
      description: module?.description,
      status,
    },
    context
  );
}

export {
  saveLessonDraft as saveRetrainingLessonDraft,
  setLessonStatus as setRetrainingLessonStatus,
  uploadAdminFile,
} from "@/lib/api/qualification";
export { createItLessonTestWithQuestions as createRetrainingLessonTest } from "@/lib/api/admin-it";

export type { RetrainingPanel } from "@/lib/retraining/admin-panels";
