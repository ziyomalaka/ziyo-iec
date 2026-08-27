/**
 * Malaka oshirish API — Swagger `admin-qualification` contract.
 * https://hassle-conceded-washtub.ngrok-free.dev/swagger/index.html
 */
import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { apiUpload, type UploadOptions } from "@/lib/api/upload";
import { asList, asPaged, parsePositiveInt, parseSignedInt, pickEntityId, unwrapApiPayload } from "@/lib/api/unwrap";
import { toQuery } from "@/lib/admin/query";
import type {
  CreateQualificationDirectionPayload,
  CreateQualificationLessonPayload,
  CreateQualificationModulePayload,
  MaterialFormData,
  QualificationDirection,
  QualificationLesson,
  QualificationLessonType,
  QualificationMaterial,
  QualificationModule,
} from "@/lib/api/types/qualification";
import { formatLessonCode } from "@/lib/qualification/constants";
import { pickFileUrl } from "@/lib/api/media";
import { isRemovedLessonRecord } from "@/lib/publish-status";

const Q = "/api/v1/admin";

type RequestMeta = {
  idempotencyKey?: string;
};

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function jsonHeaders(meta?: RequestMeta): HeadersInit | undefined {
  if (!meta?.idempotencyKey) return undefined;
  return { "Idempotency-Key": meta.idempotencyKey };
}

function silentGet(silentAuth?: boolean): ApiRequestOptions {
  return silentAuth ? { skipAuthRedirect: true } : {};
}

/** Swagger dto.QualLessonRequest: lesson_number + lesson_type + title majburiy. */
export function asQualLessonType(value?: string | null): QualificationLessonType {
  const upper = String(value ?? "").trim().toUpperCase();
  if (upper === "PRACTICAL" || upper === "AMALIY") return "PRACTICAL";
  return "THEORY";
}

export function qualLessonRequest(payload: {
  lesson_number?: number | null;
  lesson_type?: string | null;
  title?: string | null;
  status?: string | null;
}) {
  const n = Number(payload.lesson_number);
  const lesson_number = Number.isInteger(n) && n > 0 ? n : 1;
  const title = (payload.title ?? "").trim() || "Dars";
  const body: Record<string, unknown> = {
    lesson_number,
    lesson_type: asQualLessonType(payload.lesson_type),
    title,
    sort_order: lesson_number,
  };
  const status = (payload.status ?? "").trim().toUpperCase();
  if (status) body.status = status;
  return body;
}

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

function mapLesson(data: unknown): QualificationLesson {
  const row = asRecord(unwrapApiPayload(data));
  return {
    id: parsePositiveInt(row.id) ?? 0,
    module_id: parsePositiveInt(row.module_id) ?? undefined,
    lesson_number: parseSignedInt(row.lesson_number) ?? parseSignedInt(row.sort_order) ?? undefined,
    lesson_code:
      typeof row.lesson_code === "string"
        ? row.lesson_code
        : undefined,
    lesson_type: typeof row.lesson_type === "string" ? row.lesson_type : undefined,
    title: String(row.title ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    materials: Array.isArray(row.materials) ? row.materials.map(mapMaterial) : undefined,
  };
}

function isActiveLesson(lesson: QualificationLesson) {
  if (!lesson.id) return false;
  return !isRemovedLessonRecord(lesson as unknown as Record<string, unknown>);
}

function mapModule(data: unknown): QualificationModule {
  const row = asRecord(unwrapApiPayload(data));
  return {
    id: parsePositiveInt(row.id) ?? 0,
    direction_id: parsePositiveInt(row.direction_id) ?? undefined,
    module_number: parsePositiveInt(row.module_number) ?? parsePositiveInt(row.sort_order) ?? undefined,
    title: String(row.title ?? ""),
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    lessons: Array.isArray(row.lessons) ? row.lessons.map(mapLesson).filter(isActiveLesson) : undefined,
  };
}

function mapDirection(data: unknown): QualificationDirection {
  const row = asRecord(unwrapApiPayload(data));
  const modules = Array.isArray(row.modules) ? row.modules.map(mapModule) : undefined;
  return {
    id: parsePositiveInt(row.id) ?? 0,
    title: String(row.title ?? ""),
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

export async function getQualificationDirections(silentAuth = false) {
  const perPage = 200;
  const loadPage = async (page: number) => {
    const data = await apiRequest<unknown>(
      `${Q}/qualification-directions${toQuery({ page, per_page: perPage })}`,
      silentGet(silentAuth)
    );
    const paged = asPaged<unknown>(data);
    const rows = paged.items.length ? paged.items : asList<unknown>(data, ["items", "directions"]);
    return {
      items: rows.map(mapDirection).filter((item) => item.id > 0),
      total_pages: paged.total_pages || 1,
      total: paged.total || 0,
    };
  };

  const first = await loadPage(1);
  const pages = Math.min(15, Math.max(1, first.total_pages || Math.ceil((first.total || first.items.length) / perPage) || 1));
  const rest =
    pages > 1
      ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) => loadPage(index + 2)))
      : [];
  const byId = new Map<number, (typeof first.items)[number]>();
  for (const item of [...first.items, ...rest.flatMap((page) => page.items)]) {
    byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export async function getQualificationModules(directionId: number, silentAuth = false) {
  const data = await apiRequest<unknown>(
    `${Q}/qualification-directions/${directionId}/modules`,
    silentGet(silentAuth)
  );
  return asList<unknown>(data, ["items", "modules"]).map(mapModule).filter((item) => item.id);
}

export async function getQualificationLessons(moduleId: number, moduleNumber?: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`${Q}/modules/${moduleId}/lessons`, silentGet(silentAuth));
  return asList<unknown>(data, ["items", "lessons"])
    .map(mapLesson)
    .filter(isActiveLesson)
    .map((lesson) => ({
      ...lesson,
      module_id: lesson.module_id ?? moduleId,
      lesson_code: lesson.lesson_code || formatLessonCode(moduleNumber ?? null, lesson.lesson_number ?? null),
    }));
}

export async function getQualificationMaterials(lessonId: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`${Q}/lessons/${lessonId}/materials`, silentGet(silentAuth));
  return asList<unknown>(data, ["items", "materials"])
    .map(mapMaterial)
    .filter((item) => item.id)
    .map((item) => ({ ...item, lesson_id: item.lesson_id ?? lessonId }));
}

export async function getQualificationTests(lessonId: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`${Q}/lessons/${lessonId}/tests`, silentGet(silentAuth));
  return asList<unknown>(data, ["items", "tests"]).map((row) => {
    const item = asRecord(unwrapApiPayload(row));
    return {
      id: parsePositiveInt(item.id) ?? 0,
      lesson_id: parsePositiveInt(item.lesson_id) ?? lessonId,
      type: "TEST" as const,
      title: String(item.title ?? "Test"),
      status: typeof item.status === "string" ? item.status : undefined,
    } satisfies QualificationMaterial;
  }).filter((item) => item.id);
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

export async function createQualificationDirection(payload: CreateQualificationDirectionPayload) {
  const created = await apiRequest<unknown>(`${Q}/qualification-directions`, {
    method: "POST",
    body: JSON.stringify(directionBody(payload)),
  });
  const mapped = mapDirection(created);
  mapped.id = mapped.id || pickEntityId(created) || 0;
  mapped.title = mapped.title || payload.title;
  mapped.category_id = mapped.category_id ?? payload.category_id;
  mapped.source = "qualification";
  return mapped;
}

export async function updateQualificationDirection(id: number, payload: CreateQualificationDirectionPayload) {
  const updated = await apiRequest<unknown>(`${Q}/qualification-directions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(directionBody(payload)),
  });
  const mapped = mapDirection(updated);
  return {
    ...mapped,
    id: mapped.id || id,
    title: mapped.title || payload.title,
    category_id: mapped.category_id ?? payload.category_id,
    source: "qualification" as const,
  } satisfies QualificationDirection;
}

export async function deleteQualificationDirection(id: number) {
  return apiRequest<unknown>(`${Q}/qualification-directions/${id}`, { method: "DELETE" });
}

export async function getQualificationDirection(id: number, silentAuth = false, options?: { fetchMaterials?: boolean }) {
  const direction = mapDirection(
    await apiRequest<unknown>(`${Q}/qualification-directions/${id}`, silentGet(silentAuth))
  );
  const fetchMaterials = options?.fetchMaterials !== false;
  // Detail allaqachon modules (shu jumladan DRAFT) qaytarsa — alohida /modules shart emas.
  let modules = (direction.modules ?? []).filter((item) => item.id);
  if (!modules.length) {
    modules = await getQualificationModules(id, silentAuth);
  }
  const withLessons = await Promise.all(
    modules.map(async (item) => {
      const existing = (item.lessons ?? []).filter((lesson) => lesson.id);
      const lessons =
        existing.length > 0
          ? existing
          : await getQualificationLessons(item.id, item.module_number, silentAuth);
      if (!fetchMaterials) {
        return { ...item, lessons };
      }
      const withMaterials = await Promise.all(
        lessons.map(async (lesson) => {
          // lessons[] ichida materials[] bor — qayta so'rov shart emas.
          if (lesson.materials !== undefined) return lesson;
          const [materials, tests] = await Promise.all([
            getQualificationMaterials(lesson.id, silentAuth).catch(() => lesson.materials ?? []),
            getQualificationTests(lesson.id, silentAuth).catch(() => [] as QualificationMaterial[]),
          ]);
          return { ...lesson, materials: [...materials, ...tests] };
        })
      );
      return { ...item, lessons: withMaterials };
    })
  );
  return { ...direction, id: direction.id || id, modules: withLessons };
}

export async function createQualificationModule(
  directionId: number,
  payload: CreateQualificationModulePayload,
  meta?: RequestMeta
) {
  const created = await apiRequest<unknown>(`${Q}/qualification-directions/${directionId}/modules`, {
    method: "POST",
    headers: jsonHeaders(meta),
    body: JSON.stringify({
      module_number: payload.module_number,
      title: payload.title,
      sort_order: payload.module_number,
      ...(payload.status ? { status: payload.status } : {}),
    }),
  });
  const mapped = mapModule(created);
  mapped.id = mapped.id || pickEntityId(created, ["id", "module_id"]) || 0;
  mapped.direction_id = directionId;
  mapped.module_number = mapped.module_number ?? payload.module_number;
  mapped.title = mapped.title || payload.title;
  return mapped;
}

export async function updateQualificationModule(id: number, payload: CreateQualificationModulePayload) {
  const updated = await apiRequest<unknown>(`${Q}/modules/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      module_number: payload.module_number,
      title: payload.title,
      sort_order: payload.module_number,
      ...(payload.status ? { status: payload.status } : {}),
    }),
  });
  const mapped = mapModule(updated);
  return {
    ...mapped,
    id,
    module_number: mapped.module_number ?? payload.module_number,
    title: mapped.title || payload.title,
  } satisfies QualificationModule;
}

export async function deleteQualificationModule(id: number) {
  return apiRequest<unknown>(`${Q}/modules/${id}`, { method: "DELETE" });
}

export async function deleteQualificationLesson(id: number) {
  return apiRequest<unknown>(`${Q}/lessons/${id}`, { method: "DELETE" });
}

export async function deleteQualificationMaterial(id: number) {
  return apiRequest<unknown>(`${Q}/materials/${id}`, { method: "DELETE" });
}

export async function deleteQualificationTest(id: number) {
  return apiRequest<unknown>(`${Q}/tests/${id}`, { method: "DELETE" });
}

export async function createQualificationLesson(
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
      created = await createWithNumber(lessonNumber, attempt === 0);
      break;
    } catch (error) {
      if (!isLessonNumberConflict(error) || attempt === 7) throw error;
      occupied.push(lessonNumber);
      lessonNumber = nextFreeLessonNumber(lessonNumber + 1, occupied);
    }
  }
  if (created === undefined) throw new ApiError(400, "Dars yaratilmadi");

  const mapped = mapLesson(created);
  mapped.id = mapped.id || pickEntityId(created, ["id", "lesson_id"]) || 0;
  mapped.module_id = moduleId;
  mapped.lesson_number = mapped.lesson_number ?? lessonNumber;
  mapped.lesson_type = mapped.lesson_type ?? lessonType;
  mapped.title = mapped.title || title;
  return mapped;
}

export async function updateQualificationLesson(id: number, payload: CreateQualificationLessonPayload & { status?: string }) {
  const updated = await apiRequest<unknown>(`${Q}/lessons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(qualLessonRequest(payload)),
  });
  const mapped = mapLesson(updated);
  return {
    ...mapped,
    id,
    lesson_number: mapped.lesson_number ?? payload.lesson_number,
    lesson_type: mapped.lesson_type ?? payload.lesson_type,
    title: mapped.title || payload.title,
  } satisfies QualificationLesson;
}

/** POST {API_URL}/api/v1/admin/files — to'g'ridan-to'g'ri backend, proxy yo'q. */
export async function uploadAdminFile(file: File, options?: UploadOptions) {
  const form = new FormData();
  form.append("file", file);
  const uploaded = await apiUpload<unknown>(`${Q}/files`, form, options);
  const row = asRecord(unwrapApiPayload(uploaded));
  // backend { id } yoki { file_id } yoki { data: { id } } formatlarini qo'llab-quvvatlash
  const id =
    parsePositiveInt(row.id) ??
    parsePositiveInt(row.file_id) ??
    pickEntityId(uploaded, ["id", "file_id"]);
  if (!id) {
    // eslint-disable-next-line no-console
    console.error("[uploadAdminFile] Backend javobi:", uploaded);
    throw new ApiError(500, "Fayl ID qaytmadi");
  }
  const originalName = typeof row.original_name === "string" ? row.original_name : file.name;
  const mimeType = typeof row.mime_type === "string" ? row.mime_type : file.type;
  const extension =
    typeof row.extension === "string"
      ? row.extension
      : originalName.includes(".")
        ? originalName.slice(originalName.lastIndexOf(".") + 1).toLowerCase()
        : "";
  const url = pickFileUrl(row);
  return {
    id,
    original_name: originalName,
    mime_type: mimeType,
    size: parsePositiveInt(row.size) ?? file.size,
    extension,
    url,
    storage_path: typeof row.storage_path === "string" ? row.storage_path : url,
  };
}

function materialDescription(item: MaterialFormData) {
  const parts: string[] = [];
  if (item.description?.trim()) parts.push(item.description.trim());
  if (item.goal?.trim()) parts.push(`Maqsad:\n${item.goal.trim()}`);
  if (item.procedure?.trim()) parts.push(`Bajarish tartibi:\n${item.procedure.trim()}`);
  if (item.assignment?.trim()) parts.push(`Topshiriq:\n${item.assignment.trim()}`);
  if (item.instruction?.trim()) parts.push(`Ko'rsatma:\n${item.instruction.trim()}`);
  if (item.durationSeconds) parts.push(`Davomiyligi: ${Math.round(item.durationSeconds)}s`);
  return parts.join("\n\n");
}

function materialTypeRequiresFileId(type: MaterialFormData["type"]) {
  return type === "VIDEO" || type === "PRESENTATION";
}

/**
 * Material yuklash (qualification, IT, majburiy blog — bir xil admin API):
 * 1. POST /api/v1/admin/files (multipart/form-data)
 * 2. POST /api/v1/admin/lessons/{lessonId}/materials (JSON, file_id majburiy)
 */
export async function submitLessonMaterial(
  lessonId: number,
  item: MaterialFormData,
  options?: UploadOptions
) {
  if (item.type === "TEST") {
    const created = await apiRequest<unknown>(`${Q}/lessons/${lessonId}/tests`, {
      method: "POST",
      body: JSON.stringify({
        title: item.title.trim(),
        passing_score: item.passingScore ?? 70,
        duration_minutes: item.durationMinutes ?? 30,
        attempt_limit: item.attempts ?? 2,
      }),
    });
    const testId = parsePositiveInt(asRecord(unwrapApiPayload(created)).id) ?? pickEntityId(created);
    if (!testId) throw new ApiError(500, "Test ID qaytmadi");
    for (const [index, question] of (item.questions ?? []).entries()) {
      await apiRequest<unknown>(`${Q}/tests/${testId}/questions`, {
        method: "POST",
        body: JSON.stringify({
          question: question.question.trim(),
          question_type: "single_choice",
          sort_order: index + 1,
          answers: question.options.map((option) => ({
            answer: option.text.trim(),
            is_correct: option.key === question.correctAnswer,
          })),
        }),
      });
    }
    return { id: testId, type: "TEST" as const };
  }

  let fileId: number | undefined = item.fileId;
  if (item.file) {
    const uploaded = await uploadAdminFile(item.file, options);
    fileId = uploaded.id;
  }

  const isCreate = !item.serverId;
  if (isCreate && materialTypeRequiresFileId(item.type) && !fileId) {
    throw new ApiError(400, "Fayl yuklash majburiy");
  }
  if (isCreate && item.file && !fileId) {
    throw new ApiError(500, "Fayl ID qaytmadi");
  }

  const body: { title: string; type: MaterialFormData["type"]; description?: string; file_id?: number } = {
    title: item.title.trim(),
    type: item.type,
    description: materialDescription(item) || undefined,
  };
  if (fileId) body.file_id = fileId;

  if (item.serverId) {
    const updated = await apiRequest<unknown>(`${Q}/materials/${item.serverId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const id = parsePositiveInt(asRecord(unwrapApiPayload(updated)).id) ?? item.serverId;
    return { id, type: item.type, fileId };
  }

  const created = await apiRequest<unknown>(`${Q}/lessons/${lessonId}/materials`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const createdRow = asRecord(unwrapApiPayload(created));
  const id =
    parsePositiveInt(createdRow.id) ??
    parsePositiveInt(createdRow.material_id) ??
    pickEntityId(created, ["id", "material_id"]) ??
    0;
  return { id, type: item.type, fileId };
}

/** @deprecated Use submitLessonMaterial — swagger JSON + file_id. */
export async function uploadLessonMaterial(
  lessonId: number,
  payload: FormData,
  options?: UploadOptions
) {
  const file = payload.get("file");
  const item: MaterialFormData = {
    type: String(payload.get("type") || "VIDEO") as MaterialFormData["type"],
    title: String(payload.get("title") || ""),
    description: String(payload.get("description") || ""),
    file: file instanceof File ? file : null,
    uploaded: false,
    uploadProgress: 0,
    assignment: String(payload.get("assignment") || ""),
    instruction: String(payload.get("instruction") || ""),
    goal: String(payload.get("goal") || ""),
    procedure: String(payload.get("procedure") || ""),
    questionsCount: Number(payload.get("questions_count") || 0) || undefined,
    passingScore: payload.has("passing_score") ? Number(payload.get("passing_score")) : undefined,
    durationMinutes: payload.has("duration_minutes") ? Number(payload.get("duration_minutes")) : undefined,
    attempts: payload.has("attempts") ? Number(payload.get("attempts")) : undefined,
  };
  return submitLessonMaterial(lessonId, item, options);
}

/**
 * Dars uchun test yaratish: bitta test + barcha savollar ketma-ket.
 * TestMaterialForm wizard "Testni saqlash" tugmasi tomonidan chaqiriladi.
 *
 * lessonId — URL path: POST /api/v1/admin/lessons/{lessonId}/tests
 * Body ichida lesson_id YO'Q — backend path parametridan bog'laydi.
 */
export async function createLessonTest(lessonId: number, item: MaterialFormData) {
  const payload = {
    title: item.title.trim() || "Test",
    passing_score: item.passingScore ?? 70,
    duration_minutes: item.durationMinutes ?? 30,
    attempt_limit: item.attempts ?? 2,
  };
  const requestUrl = `${Q}/lessons/${lessonId}/tests`;

  console.log("ADMIN TEST SAVE lessonId:", lessonId);
  console.log("ADMIN TEST SAVE URL:", requestUrl);
  console.log("ADMIN TEST PAYLOAD:", payload);
  console.table({
    adminSavedLessonId: lessonId,
    note: "lessonId faqat URL pathda; body da lesson_id yo'q",
  });

  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("zm_diag_admin_test_lesson_id", String(lessonId));
      window.sessionStorage.setItem("zm_diag_admin_test_saved_at", new Date().toISOString());
    } catch {
      /* ignore */
    }
  }

  const created = await apiRequest<unknown>(requestUrl, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const testId = parsePositiveInt(asRecord(unwrapApiPayload(created)).id) ?? pickEntityId(created);
  if (!testId) throw new ApiError(500, "Test ID qaytmadi");

  console.log("ADMIN TEST SAVE response testId:", testId);
  console.log("ADMIN TEST SAVE created raw:", created);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("zm_diag_admin_test_id", String(testId));
    } catch {
      /* ignore */
    }
  }

  // Student lesson cache eski tests[] ni ko'rsatmasin
  try {
    const { invalidateLearningCache } = await import("@/lib/api/learning");
    invalidateLearningCache(undefined, lessonId);
  } catch {
    /* ignore */
  }

  for (const [index, question] of (item.questions ?? []).entries()) {
    await apiRequest<unknown>(`${Q}/tests/${testId}/questions`, {
      method: "POST",
      body: JSON.stringify({
        question: question.question.trim(),
        question_type: "single_choice",
        sort_order: index + 1,
        answers: question.options.map((opt) => ({
          answer: opt.text.trim(),
          is_correct: opt.key === question.correctAnswer,
        })),
      }),
    });
  }
  return { id: testId };
}

export async function saveLessonDraft(
  lessonId: number,
  payload?: Partial<CreateQualificationLessonPayload>
) {
  // Qoralama: PATCH to'liq QualLessonRequest + status DRAFT (faqat status 400).
  return apiRequest<unknown>(`${Q}/lessons/${lessonId}`, {
    method: "PATCH",
    body: JSON.stringify(qualLessonRequest({ ...payload, status: "DRAFT" })),
  });
}

/**
 * Dars statusini qo'lda o'zgartirish (unpublish / arxiv / qayta ochish).
 * status: DRAFT | PUBLISHED | INACTIVE | ARCHIVED
 * PUBLISHED — publish endpoint checklarisiz ochiladi.
 * Userdan yashirish: DRAFT yoki ARCHIVED.
 */
export async function setLessonStatus(
  lessonId: number,
  status: "DRAFT" | "PUBLISHED" | "INACTIVE" | "ARCHIVED",
  lesson?: { lesson_number?: number; lesson_type?: string; title?: string }
) {
  return apiRequest<unknown>(`${Q}/lessons/${lessonId}`, {
    method: "PATCH",
    body: JSON.stringify(
      qualLessonRequest({
        lesson_number: lesson?.lesson_number,
        lesson_type: lesson?.lesson_type,
        title: lesson?.title,
        status,
      })
    ),
  });
}

/**
 * Modul statusini qo'lda o'zgartirish.
 * status: DRAFT | PUBLISHED | INACTIVE | ARCHIVED
 * DRAFT/ARCHIVED — studentdan yashirish; PUBLISHED — ochish.
 */
export async function setModuleStatus(
  moduleId: number,
  status: "DRAFT" | "PUBLISHED" | "INACTIVE" | "ARCHIVED",
  module?: { module_number?: number; title?: string }
) {
  const body: Record<string, unknown> = { status };
  if (module?.module_number != null) {
    body.module_number = module.module_number;
    body.sort_order = module.module_number;
  }
  if (module?.title?.trim()) body.title = module.title.trim();
  return apiRequest<unknown>(`${Q}/modules/${moduleId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/**
 * Darsni nashr qiladi — faqat POST /lessons/{id}/publish.
 * Backend tekshiruvlari: kamida 1 material, modul/yo'nalish mavjud, va hokazo.
 * Muvaffaqiyatda status: PUBLISHED.
 * Eslatma: PATCH status=PUBLISHED checklarni aylanib o'tadi — nashr uchun ishlatilmasin.
 */
export async function publishLesson(lessonId: number) {
  return apiRequest<unknown>(`${Q}/lessons/${lessonId}/publish`, { method: "POST" });
}
