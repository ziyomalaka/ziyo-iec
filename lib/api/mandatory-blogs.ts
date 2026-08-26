/**
 * Majburiy blog API — Swagger `majburiy-blog`
 * https://hassle-conceded-washtub.ngrok-free.dev/swagger/index.html#/majburiy-blog
 *
 * Blogs:    GET|POST /api/v1/admin/mandatory-blogs
 *           GET|PATCH|DELETE /api/v1/admin/mandatory-blogs/{id}
 * Modules:  GET|POST /api/v1/admin/mandatory-blogs/{id}/modules
 *           PATCH|DELETE /api/v1/admin/modules/{moduleId}
 * Lessons:  GET|POST /api/v1/admin/modules/{moduleId}/lessons
 *           PATCH|DELETE /api/v1/admin/lessons/{lessonId}
 *           POST /api/v1/admin/lessons/{lessonId}/publish
 * Materials:GET|POST /api/v1/admin/lessons/{lessonId}/materials
 *           PATCH|DELETE /api/v1/admin/materials/{materialId}
 * Files:    POST /api/v1/admin/files
 *
 * Student o‘qish: swaggerda alohida majburiy endpoint yo‘q —
 * published snapshot yoki learning course (`mandatory-{id}`) orqali.
 */
import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { asList, parsePositiveInt, parseSignedInt, pickEntityId, unwrapApiPayload } from "@/lib/api/unwrap";
import { pickFileUrl } from "@/lib/api/media";
import {
  publishMandatorySnapshot,
  readMandatorySnapshot,
  readMandatorySnapshotLocal,
  removeMandatorySnapshot,
} from "@/lib/api/mandatory-snapshot";
import { formatLessonCode } from "@/lib/qualification/constants";
import { qualLessonRequest } from "@/lib/api/qualification";
import { filterPublishedContentTree, filterPublishedContentTrees, isRemovedLessonRecord } from "@/lib/publish-status";
import type {
  CreateQualificationDirectionPayload,
  CreateQualificationLessonPayload,
  CreateQualificationModulePayload,
  QualificationDirection,
  QualificationLesson,
  QualificationMaterial,
  QualificationModule,
} from "@/lib/api/types/qualification";

const Q = "/api/v1/admin";
const B = `${Q}/mandatory-blogs`;

type RequestMeta = {
  idempotencyKey?: string;
};

function isLessonNumberConflict(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 400 && error.status !== 409) return false;
  const raw = `${error.message} ${error.raw ?? ""}`.toLowerCase();
  if (
    raw.includes("lesson_number") ||
    raw.includes("lesson number") ||
    raw.includes("dars raqam") ||
    raw.includes("sort_order")
  ) {
    return true;
  }
  return (
    raw.includes("duplicate") ||
    raw.includes("unique") ||
    raw.includes("already") ||
    raw.includes("exists") ||
    raw.includes("taken") ||
    raw.includes("band") ||
    raw.includes("mavjud") ||
    raw.includes("occupied") ||
    raw.includes("conflict")
  );
}

/** Modul ichidagi band lesson_number lar (ARCHIVED ham — API qaytarsa). */
async function occupiedLessonNumbers(moduleId: number): Promise<number[]> {
  try {
    const data = await apiRequest<unknown>(`${Q}/modules/${moduleId}/lessons`, { skipAuthRedirect: true });
    return asList<unknown>(data, ["items", "lessons"])
      .map((item) => {
        const row = asRecord(unwrapApiPayload(item));
        return parsePositiveInt(row.lesson_number) ?? parsePositiveInt(row.sort_order) ?? 0;
      })
      .filter((n) => n > 0);
  } catch {
    return [];
  }
}

function nextFreeLessonNumber(preferred: number, occupied: number[]) {
  const used = new Set(occupied);
  let n = Math.max(1, preferred || 1);
  while (used.has(n)) n += 1;
  return n;
}

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

function listQuery(query: { page?: number; per_page?: number; q?: string; status?: string } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set("page", String(query.page));
  if (query.per_page) params.set("per_page", String(query.per_page));
  if (query.q?.trim()) params.set("q", query.q.trim());
  if (query.status?.trim()) params.set("status", query.status.trim());
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function mapMaterial(data: unknown): QualificationMaterial {
  const row = asRecord(data);
  const file = asRecord(row.file);
  const url = pickFileUrl(row);
  return {
    id: parsePositiveInt(row.id) ?? 0,
    lesson_id: parsePositiveInt(row.lesson_id) ?? undefined,
    type: typeof row.type === "string" ? row.type : typeof row.material_type === "string" ? row.material_type : undefined,
    title: typeof row.title === "string" ? row.title : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    source: "mandatory",
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
      typeof row.lesson_code === "string" ? row.lesson_code : formatLessonCode(moduleNumber ?? null, lessonNumber && lessonNumber > 0 ? lessonNumber : null),
    lesson_type: typeof row.lesson_type === "string" ? row.lesson_type : undefined,
    title: String(row.title ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    source: "mandatory",
    // lessons[] ichida materials[] keladi — alohida /materials faqat yo'q bo'lsa.
    materials: hasMaterials || hasTests ? [...materials, ...tests] : undefined,
  };
}

function isActiveLesson(lesson: QualificationLesson) {
  if (!lesson.id) return false;
  return !isRemovedLessonRecord(lesson as unknown as Record<string, unknown>);
}

function mapModule(data: unknown, directionId?: number): QualificationModule {
  const row = asRecord(unwrapApiPayload(data));
  const moduleNumber = parsePositiveInt(row.module_number) ?? parsePositiveInt(row.sort_order) ?? undefined;
  const id = parsePositiveInt(row.id) ?? parsePositiveInt(row.module_id) ?? 0;
  return {
    id,
    direction_id: parsePositiveInt(row.direction_id) ?? directionId,
    module_number: moduleNumber,
    title: String(row.title ?? row.name ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    source: "mandatory",
    lessons: Array.isArray(row.lessons)
      ? row.lessons.map((item) => mapLesson(item, id, moduleNumber)).filter((item) => item.id && isActiveLesson(item))
      : undefined,
  };
}

function isActiveModule(module: QualificationModule) {
  const status = (module.status ?? "").toUpperCase();
  if (!status) return true;
  return status !== "ARCHIVED" && status !== "INACTIVE" && status !== "DELETED";
}

function parseModuleRows(data: unknown, blogId: number): QualificationModule[] {
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
    .map((item) => mapModule(item, blogId))
    .filter((item) => item.id && isActiveModule(item))
    .map((item) => ({
      ...item,
      direction_id: item.direction_id ?? blogId,
      source: "mandatory" as const,
    }));
}

function nestedModules(row: Record<string, unknown>, blogId: number) {
  if (!Array.isArray(row.modules) && row.modules == null) return undefined;
  const mapped = parseModuleRows(row, blogId);
  return mapped;
}

function mapBlog(data: unknown): QualificationDirection {
  const row = asRecord(unwrapApiPayload(data));
  const id = parsePositiveInt(row.id) ?? 0;
  const modules = nestedModules(row, id);
  return {
    id,
    title: String(row.title ?? ""),
    source: "mandatory",
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

/** Swagger: GET /api/v1/admin/mandatory-blogs/{id} — blog + modules massivi. */
async function fetchMandatoryBlogById(id: number, silentAuth = false) {
  const blog = mapBlog(await apiRequest<unknown>(`${B}/${id}`, silentGet(silentAuth)));
  return {
    ...blog,
    id: blog.id || id,
    source: "mandatory" as const,
    modules: (blog.modules ?? []).map((item) => ({
      ...item,
      direction_id: item.direction_id ?? id,
      source: "mandatory" as const,
    })),
  } satisfies QualificationDirection;
}

function blogBody(payload: CreateQualificationDirectionPayload) {
  return {
    title: payload.title.trim(),
    category_id: payload.category_id,
    description: payload.description?.trim() || undefined,
    duration_hours: payload.duration_hours,
    language: payload.language,
    status: payload.status,
  };
}

/** Swagger: GET /api/v1/admin/modules/{moduleId}/lessons (majburiy-blog) */
export async function getMandatoryModuleLessons(moduleId: number, moduleNumber?: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`${Q}/modules/${moduleId}/lessons`, silentGet(silentAuth));
  return asList<unknown>(data, ["items", "lessons"])
    .map((item) => mapLesson(item, moduleId, moduleNumber))
    .filter((item) => item.id && isActiveLesson(item))
    .map((lesson) => ({
      ...lesson,
      source: "mandatory" as const,
      module_id: lesson.module_id ?? moduleId,
      lesson_code: lesson.lesson_code || formatLessonCode(moduleNumber ?? null, lesson.lesson_number ?? null),
    }));
}

async function loadLessons(moduleId: number, moduleNumber?: number, silentAuth = false) {
  try {
    return await getMandatoryModuleLessons(moduleId, moduleNumber, silentAuth);
  } catch {
    return [];
  }
}

async function loadMaterials(lessonId: number, silentAuth = false) {
  try {
    return await getMandatoryLessonMaterials(lessonId, silentAuth);
  } catch {
    return [];
  }
}

function isMissing(error: unknown) {
  return error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404);
}

type HydrateOptions = {
  allowNetwork: boolean;
  loadLessons: boolean;
  fetchMaterials: boolean;
  silentAuth: boolean;
  blogId: number;
};

async function snapshotModules(blogId: number) {
  const local = readMandatorySnapshotLocal().find((item) => item.id === blogId);
  if (local?.modules?.length) {
    return local.modules.map((item) => ({
      ...item,
      direction_id: item.direction_id ?? blogId,
      source: "mandatory" as const,
    }));
  }
  const cached = (await readMandatorySnapshot()).find((item) => item.id === blogId);
  return (cached?.modules ?? [])
    .filter((item) => item.id)
    .map((item) => ({
      ...item,
      direction_id: item.direction_id ?? blogId,
      source: "mandatory" as const,
    }));
}

async function hydrateBlog(blog: QualificationDirection, options: HydrateOptions): Promise<QualificationDirection> {
  const { allowNetwork, loadLessons: shouldLoadLessons, fetchMaterials, silentAuth, blogId } = options;
  // List/detail allaqachon modules qaytarsa — alohida GET .../modules shart emas.
  let modules = blog.modules?.filter((item) => item.id) ?? [];
  const hadModules = Array.isArray(blog.modules);
  if (allowNetwork && !modules.length) {
    const remote = await getMandatoryBlogModules(blogId, silentAuth).catch(() => []);
    if (remote.length) modules = remote;
  }
  if (!hadModules && !modules.length) {
    modules = await snapshotModules(blogId);
  }

  const withLessons = await Promise.all(
    modules.map(async (item) => {
      const existing = (item.lessons ?? []).filter((lesson) => lesson.id && isActiveLesson(lesson));
      const lessons =
        existing.length || !allowNetwork || !shouldLoadLessons
          ? existing
          : await loadLessons(item.id, item.module_number, silentAuth).catch(() => []);

      if (!fetchMaterials) {
        return {
          ...item,
          lessons: lessons.map((lesson) => ({ ...lesson, source: "mandatory" as const })),
        };
      }

      const withMaterials = await Promise.all(
        lessons.map(async (lesson) => {
          // lessons[] ichida materials[] bor — qayta so'rov shart emas.
          if (lesson.materials !== undefined || !allowNetwork) {
            return { ...lesson, source: "mandatory" as const };
          }
          const materials = await loadMaterials(lesson.id, silentAuth).catch(() => lesson.materials ?? []);
          return { ...lesson, source: "mandatory" as const, materials };
        })
      );
      return { ...item, lessons: withMaterials };
    })
  );

  return { ...blog, id: blog.id || blogId, source: "mandatory" as const, modules: withLessons };
}

export async function getMandatoryBlogs(
  query: { page?: number; per_page?: number; q?: string; status?: string } = {},
  silentAuth = false
) {
  const qs = listQuery(query);
  // Student: admin API 403 — faqat published snapshot / public-mandatory.
  if (silentAuth) {
    const cached = await readMandatorySnapshot({ forceNetwork: true });
    return filterPublishedContentTrees(cached.map((item) => ({ ...item, source: "mandatory" as const })));
  }
  try {
    const data = await apiRequest<unknown>(`${B}${qs}`, silentGet(silentAuth));
    return asList<unknown>(data, ["items", "directions", "blogs"])
      .map(mapBlog)
      .filter((item) => item.id)
      .map((item) => ({ ...item, source: "mandatory" as const }));
  } catch (error) {
    if (!isMissing(error)) throw error;
    const cached = await readMandatorySnapshot();
    return cached.map((item) => ({ ...item, source: "mandatory" as const }));
  }
}

/** Swagger: GET /api/v1/admin/mandatory-blogs/{id}/modules */
export async function getMandatoryBlogModules(id: number, silentAuth = false) {
  const mappedFrom = (data: unknown) => parseModuleRows(data, id);

  try {
    const data = await apiRequest<unknown>(`${B}/${id}/modules`, silentGet(silentAuth));
    const mapped = mappedFrom(data);
    if (mapped.length) return mapped;
  } catch (error) {
    if (!isMissing(error)) throw error;
  }

  try {
    const nested = (await fetchMandatoryBlogById(id, silentAuth)).modules?.filter((item) => item.id) ?? [];
    if (nested.length) return nested;
  } catch {
    // GET {id} ichida modules bo'lmasa
  }

  return snapshotModules(id);
}

export async function getMandatoryBlog(id: number, silentAuth = false, options?: { fetchMaterials?: boolean }) {
  const fetchMaterials = options?.fetchMaterials ?? !silentAuth;
  const studentHydrate = { allowNetwork: false, loadLessons: false, fetchMaterials: false, silentAuth, blogId: id };

  const fromLocal = () => {
    const cached = readMandatorySnapshotLocal().find((item) => item.id === id);
    return cached ? { ...cached, source: "mandatory" as const } : null;
  };

  if (silentAuth) {
    const snapshot = (await readMandatorySnapshot({ forceNetwork: true })).find((item) => item.id === id);
    const visibleSnap = snapshot ? filterPublishedContentTree({ ...snapshot, source: "mandatory" as const }) : null;
    if (visibleSnap) return hydrateBlog(visibleSnap, studentHydrate);
    throw new ApiError(404, "Blog topilmadi");
  }

  try {
    const blog = await fetchMandatoryBlogById(id, silentAuth);
    const detailed = await hydrateBlog(blog, {
      allowNetwork: true,
      loadLessons: true,
      fetchMaterials,
      silentAuth,
      blogId: id,
    });
    // Read path: live-refresh yoqilmasin (aks holda admin list infinite refetch).
    if (!silentAuth) void publishMandatorySnapshot([detailed], "upsert", { notify: false });
    return detailed;
  } catch (error) {
    if (!isMissing(error)) throw error;
    const local = fromLocal() ?? (await readMandatorySnapshot()).find((item) => item.id === id);
    if (local) {
      return hydrateBlog({ ...local, source: "mandatory" as const }, studentHydrate);
    }
    throw error;
  }
}

export async function getMandatoryBlogsDetailed(silentAuth = false) {
  const blogs = await getMandatoryBlogs({ per_page: 100 }, silentAuth);
  if (silentAuth) return blogs;
  return Promise.all(blogs.map((blog) => getMandatoryBlog(blog.id, silentAuth).catch(() => blog)));
}

export async function createMandatoryBlog(payload: CreateQualificationDirectionPayload) {
  const created = await apiRequest<unknown>(B, {
    method: "POST",
    body: JSON.stringify(blogBody(payload)),
  });
  const mapped = mapBlog(created);
  mapped.id = mapped.id || pickEntityId(created) || 0;
  mapped.title = mapped.title || payload.title;
  mapped.category_id = mapped.category_id ?? payload.category_id;
  mapped.status = mapped.status || payload.status;
  mapped.source = "mandatory";
  void publishMandatorySnapshot([mapped], "upsert", { notify: true });
  return mapped;
}

export async function updateMandatoryBlog(id: number, payload: CreateQualificationDirectionPayload) {
  const updated = await apiRequest<unknown>(`${B}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(blogBody(payload)),
  });
  const mapped = mapBlog(updated);
  const next = {
    ...mapped,
    id: mapped.id || id,
    title: mapped.title || payload.title,
    category_id: mapped.category_id ?? payload.category_id,
    status: mapped.status || payload.status,
    source: "mandatory" as const,
  } satisfies QualificationDirection;
  void publishMandatorySnapshot([next], "upsert", { notify: true });
  return next;
}

export async function deleteMandatoryBlog(id: number) {
  const result = await apiRequest<unknown>(`${B}/${id}`, { method: "DELETE" });
  await removeMandatorySnapshot(id);
  return result;
}

export async function createMandatoryModule(
  blogId: number,
  payload: CreateQualificationModulePayload,
  meta?: RequestMeta
) {
  const created = await apiRequest<unknown>(`${B}/${blogId}/modules`, {
    method: "POST",
    headers: jsonHeaders(meta),
    body: JSON.stringify({
      module_number: payload.module_number,
      title: payload.title.trim(),
      sort_order: payload.module_number,
    }),
  });
  const mapped = mapModule(created, blogId);
  mapped.id = mapped.id || pickEntityId(created, ["id", "module_id"]) || 0;
  if (!mapped.id) throw new ApiError(500, "Modul ID qaytmadi");
  mapped.direction_id = blogId;
  mapped.module_number = mapped.module_number ?? payload.module_number;
  mapped.title = mapped.title || payload.title.trim();
  mapped.source = "mandatory";
  return mapped;
}

/** Swagger: PATCH /api/v1/admin/modules/{moduleId} (majburiy-blog) */
export async function updateMandatoryModule(id: number, payload: CreateQualificationModulePayload) {
  const updated = await apiRequest<unknown>(`${Q}/modules/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      module_number: payload.module_number,
      title: payload.title.trim(),
      sort_order: payload.module_number,
      ...(payload.status ? { status: payload.status } : {}),
    }),
  });
  const mapped = mapModule(updated);
  return {
    ...mapped,
    id: mapped.id || id,
    module_number: mapped.module_number ?? payload.module_number,
    title: mapped.title || payload.title.trim(),
    source: "mandatory" as const,
  } satisfies QualificationModule;
}

/** Swagger: POST /api/v1/admin/modules/{moduleId}/lessons (majburiy-blog) */
export async function createMandatoryLesson(
  moduleId: number,
  payload: CreateQualificationLessonPayload,
  meta?: RequestMeta
) {
  const occupied = await occupiedLessonNumbers(moduleId);
  let lessonNumber = nextFreeLessonNumber(payload.lesson_number, occupied);
  const lessonType = String(payload.lesson_type || "THEORY").toUpperCase() as CreateQualificationLessonPayload["lesson_type"];
  const title = payload.title.trim();
  if (!title) throw new ApiError(400, "Dars nomi majburiy");

  const createWithNumber = (n: number, withIdempotency: boolean) =>
    apiRequest<unknown>(`${Q}/modules/${moduleId}/lessons`, {
      method: "POST",
      headers: withIdempotency ? jsonHeaders(meta) : undefined,
      body: JSON.stringify({
        lesson_number: n,
        lesson_type: lessonType,
        title,
        sort_order: n,
      }),
    });

  let created: unknown | undefined;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      // Idempotency faqat 1-urinish — aks holda band raqam 400 qayta cache bo'ladi
      created = await createWithNumber(lessonNumber, attempt === 0);
      break;
    } catch (error) {
      if (!isLessonNumberConflict(error) || attempt === 7) throw error;
      occupied.push(lessonNumber);
      lessonNumber = nextFreeLessonNumber(lessonNumber + 1, occupied);
    }
  }
  if (created === undefined) throw new ApiError(400, "Dars yaratilmadi");

  const mapped = mapLesson(created, moduleId);
  mapped.id = mapped.id || pickEntityId(created, ["id", "lesson_id"]) || 0;
  if (!mapped.id) throw new ApiError(500, "Dars ID qaytmadi");
  mapped.module_id = moduleId;
  mapped.lesson_number = mapped.lesson_number ?? lessonNumber;
  mapped.lesson_type = mapped.lesson_type ?? lessonType;
  mapped.title = mapped.title || title;
  mapped.lesson_code =
    mapped.lesson_code || formatLessonCode(null, mapped.lesson_number ?? lessonNumber);
  mapped.source = "mandatory";
  return mapped;
}

/** Swagger: PATCH /api/v1/admin/lessons/{lessonId} (majburiy-blog) */
export async function updateMandatoryLesson(
  id: number,
  payload: CreateQualificationLessonPayload & { status?: string }
) {
  const updated = await apiRequest<unknown>(`${Q}/lessons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(qualLessonRequest(payload)),
  });
  const mapped = mapLesson(updated);
  return {
    ...mapped,
    id: mapped.id || id,
    lesson_number: mapped.lesson_number ?? payload.lesson_number,
    lesson_type: mapped.lesson_type ?? payload.lesson_type,
    title: mapped.title || payload.title.trim(),
    source: "mandatory" as const,
  } satisfies QualificationLesson;
}

/** Swagger: GET /api/v1/admin/lessons/{lessonId}/materials */
export async function getMandatoryLessonMaterials(lessonId: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`${Q}/lessons/${lessonId}/materials`, silentGet(silentAuth));
  return asList<unknown>(data, ["items", "materials"])
    .map(mapMaterial)
    .filter((item) => item.id)
    .map((item) => ({ ...item, lesson_id: item.lesson_id ?? lessonId, source: "mandatory" as const }));
}

/** Swagger: DELETE /api/v1/admin/lessons/{lessonId}
 * Soft-delete + lesson_number bo'shatadi (-id) + material/test cascade.
 * Progress bo'lsa ham o'chirish mumkin. ARCHIVED qilmang — raqam band qoladi.
 */
export async function deleteMandatoryLesson(id: number) {
  return apiRequest<unknown>(`${Q}/lessons/${id}`, { method: "DELETE" });
}

/** Swagger: DELETE /api/v1/admin/modules/{moduleId} — soft-delete */
export async function deleteMandatoryModule(id: number) {
  return apiRequest<unknown>(`${Q}/modules/${id}`, { method: "DELETE" });
}

/** Swagger: DELETE /api/v1/admin/materials/{materialId} — soft-delete */
export async function deleteMandatoryMaterial(id: number) {
  return apiRequest<unknown>(`${Q}/materials/${id}`, { method: "DELETE" });
}

/** Swagger: PATCH /api/v1/admin/materials/{materialId} */
export async function updateMandatoryMaterial(
  id: number,
  payload: { title: string; type: string; description?: string; file_id?: number }
) {
  const updated = await apiRequest<unknown>(`${Q}/materials/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapMaterial(updated);
}

/** Majburiy blog: POST /publish (checklar bilan) + PATCH status (qo'lda) */
export {
  submitLessonMaterial as submitMandatoryLessonMaterial,
  uploadAdminFile,
  publishLesson as publishMandatoryLesson,
  setLessonStatus as setMandatoryLessonStatus,
  setModuleStatus as setMandatoryModuleStatus,
  saveLessonDraft as saveMandatoryLessonDraft,
} from "@/lib/api/qualification";
