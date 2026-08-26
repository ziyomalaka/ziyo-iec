import { toQuery } from "@/lib/admin/query";
import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { apiUpload } from "@/lib/api/upload";
import { pickFileUrl } from "@/lib/api/media";
import type {
  CreateITCourseRequest,
  CreateItAssignmentRequest,
  CreateItDirectionRequest,
  CreateItLessonRequest,
  CreateItMaterialRequest,
  CreateItModuleRequest,
  CreateItTestPayload,
  CreateItTestQuestionPayload,
  ITUserRoleResponse,
  ItAssignment,
  ItCategory,
  ItCourse,
  ItDirection,
  ItLesson,
  ItListQuery,
  ItMaterial,
  ItModule,
  ItTest,
  ItTestQuestion,
  LessonType,
  HealthDirectionNode,
  HealthLessonNode,
  HealthModuleNode,
  LessonsByType,
  SystemContentHealth,
  SystemHealth,
  SystemSetting,
} from "@/lib/api/types/admin";
import type { MaterialFormData } from "@/lib/api/types/qualification";
import { asList, asPaged, parsePositiveInt, pickEntityId, unwrapApiPayload, type PagedResponse } from "@/lib/api/unwrap";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function asMaterial(data: unknown): ItMaterial | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id) ?? pickEntityId(data);
  if (!id) return null;
  const order = Number(row.order_index);
  const url = pickFileUrl(row);
  return {
    id,
    lesson_id: parsePositiveInt(row.lesson_id) ?? undefined,
    material_type: typeof row.material_type === "string" ? row.material_type : undefined,
    type_label: typeof row.type_label === "string" ? row.type_label : undefined,
    title: String(row.title ?? ""),
    content_text: typeof row.content_text === "string" ? row.content_text : undefined,
    url: url || undefined,
    file_url: url || undefined,
    file: url ? { url } : undefined,
    order_index: Number.isFinite(order) ? order : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
  };
}

function asAssignment(data: unknown): ItAssignment | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id) ?? pickEntityId(data);
  if (!id) return null;
  const order = Number(row.order_index);
  return {
    id,
    lesson_id: parsePositiveInt(row.lesson_id) ?? undefined,
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : undefined,
    file_url: typeof row.file_url === "string" ? row.file_url : undefined,
    order_index: Number.isFinite(order) ? order : undefined,
  };
}

function asLessonKind(lessonType?: string, description?: string) {
  const raw = String(lessonType ?? "").trim().toUpperCase();
  if (raw === "THEORY" || raw === "NAZARIY") return "THEORY";
  if (raw === "PRACTICAL" || raw === "PRACTICE" || raw === "AMALIY") return "PRACTICAL";
  const match = String(description ?? "").match(/^ZM_KIND:(THEORY|PRACTICAL)/);
  return match?.[1];
}

function stripKindMarker(description?: string) {
  return String(description ?? "").replace(/^ZM_KIND:(THEORY|PRACTICAL)\n?/, "").trim();
}

function asLesson(data: unknown): ItLesson | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id) ?? pickEntityId(data);
  if (!id) return null;
  const minutes = Number(row.duration_minutes);
  const order = Number(row.order_index);
  const materials = Array.isArray(row.materials)
    ? row.materials.map(asMaterial).filter((item): item is ItMaterial => item !== null)
    : undefined;
  const assignments = Array.isArray(row.assignments)
    ? row.assignments.map(asAssignment).filter((item): item is ItAssignment => item !== null)
    : undefined;
  const rawDescription = typeof row.description === "string" ? row.description : undefined;
  const storedKind = asLessonKind(typeof row.lesson_type === "string" ? row.lesson_type : undefined, rawDescription);
  const cleaned = stripKindMarker(rawDescription);
  return {
    id,
    title: String(row.title ?? ""),
    item_type:
      typeof row.item_type === "string"
        ? row.item_type
        : row.lesson_type === "test"
          ? "test"
          : "lesson",
    lesson_type: storedKind ?? (typeof row.lesson_type === "string" ? (row.lesson_type as LessonType) : undefined),
    description: cleaned ? cleaned : undefined,
    file_url: pickFileUrl(row) || undefined,
    video_url: typeof row.video_url === "string" ? row.video_url : pickFileUrl(row) || undefined,
    content_url: typeof row.content_url === "string" ? row.content_url : undefined,
    content_text: typeof row.content_text === "string" ? row.content_text : undefined,
    duration_minutes: Number.isFinite(minutes) ? minutes : undefined,
    teacher_name: typeof row.teacher_name === "string" ? row.teacher_name : undefined,
    order_index: Number.isFinite(order) ? order : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    materials: materials?.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    assignments: assignments?.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  };
}

function asModule(data: unknown): ItModule | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id) ?? pickEntityId(data, ["id", "module_id"]);
  if (!id) return null;
  const order = Number(row.order_index);
  const lessons = Array.isArray(row.lessons)
    ? row.lessons
        .map((item) => {
          try {
            return asLesson(item);
          } catch {
            return null;
          }
        })
        .filter((item): item is ItLesson => item !== null)
    : [];
  const materials = Array.isArray(row.materials)
    ? row.materials.map(asMaterial).filter((item): item is ItMaterial => item !== null)
    : [];
  return {
    id,
    title: String(row.title ?? ""),
    order_index: Number.isFinite(order) ? order : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    lessons: lessons.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    materials: materials.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  };
}

export function normalizeItDirection(data: unknown): ItDirection {
  const row = asRecord(unwrapApiPayload(data));
  const modules = Array.isArray(row.modules)
    ? row.modules.map(asModule).filter((item): item is ItModule => item !== null)
    : [];
  return {
    id: parsePositiveInt(row.id) ?? pickEntityId(data) ?? 0,
    title: String(row.title ?? ""),
    description: typeof row.description === "string" ? row.description : undefined,
    thumbnail_url: typeof row.thumbnail_url === "string" ? row.thumbnail_url : undefined,
    duration_hours: Number(row.duration_hours) || undefined,
    duration_label: typeof row.duration_label === "string" ? row.duration_label : undefined,
    language: typeof row.language === "string" ? row.language : undefined,
    category_id: parsePositiveInt(row.category_id) ?? undefined,
    category_name: typeof row.category_name === "string" ? row.category_name : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    course_type: typeof row.course_type === "string" ? row.course_type : undefined,
    subject: typeof row.subject === "string" ? row.subject : undefined,
    module_count: Number(row.module_count) || modules.length || undefined,
    modules: modules.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
  };
}

export function normalizeItCourse(data: unknown): ItCourse {
  const direction = normalizeItDirection(data);
  const row = asRecord(unwrapApiPayload(data));
  return {
    ...direction,
    course_type: typeof row.course_type === "string" ? row.course_type : undefined,
    subject: typeof row.subject === "string" ? row.subject : undefined,
  };
}

function listQuery(query?: ItListQuery) {
  return toQuery({
    page: query?.page,
    per_page: query?.per_page,
    q: query?.q?.trim() || undefined,
    category_id: query?.category_id,
  });
}

function pagedEntities<T>(
  data: unknown,
  extraKeys: string[],
  map: (item: unknown) => T,
  hasId: (item: T) => boolean
): PagedResponse<T> {
  const page = asPaged<unknown>(data);
  const raw = page.items.length ? page.items : asList<unknown>(data, extraKeys);
  const items = raw
    .map((item) => {
      try {
        return map(item);
      } catch {
        return null;
      }
    })
    .filter((item): item is T => item !== null && hasId(item));
  return {
    items,
    total: page.total || items.length,
    page: page.page || 1,
    per_page: page.per_page || items.length || 10,
    total_pages: page.total_pages || 1,
  };
}

export async function getItSettings() {
  const data = await apiRequest<unknown>("/admin/it/settings");
  return asList<SystemSetting>(data, ["items", "settings"]);
}

export async function updateItSetting(key: string, value: string) {
  const data = await apiRequest<unknown>(`/admin/it/settings/${key}`, {
    method: "PUT",
    body: JSON.stringify({ value }),
  });
  return unwrapApiPayload<SystemSetting>(data);
}

export async function updateItUserRole(id: number, role: string) {
  const data = await apiRequest<unknown>(`/admin/it/users/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
  return unwrapApiPayload<ITUserRoleResponse>(data);
}

function asHealthLesson(data: unknown): HealthLessonNode | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id);
  if (!id) return null;
  return {
    id,
    title: String(row.title ?? ""),
    lesson_type: typeof row.lesson_type === "string" ? row.lesson_type : undefined,
    health: typeof row.health === "string" ? row.health : undefined,
    health_label: typeof row.health_label === "string" ? row.health_label : undefined,
    has_content: typeof row.has_content === "boolean" ? row.has_content : undefined,
    empty: typeof row.empty === "boolean" ? row.empty : undefined,
  };
}

function asHealthModule(data: unknown): HealthModuleNode | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id);
  if (!id) return null;
  const lessons = Array.isArray(row.lessons)
    ? row.lessons.map(asHealthLesson).filter((item): item is HealthLessonNode => item !== null)
    : [];
  return {
    id,
    title: String(row.title ?? ""),
    health: typeof row.health === "string" ? row.health : undefined,
    health_label: typeof row.health_label === "string" ? row.health_label : undefined,
    empty: typeof row.empty === "boolean" ? row.empty : undefined,
    lessons,
  };
}

function asHealthDirection(data: unknown): HealthDirectionNode | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id);
  if (!id) return null;
  const modules = Array.isArray(row.modules)
    ? row.modules.map(asHealthModule).filter((item): item is HealthModuleNode => item !== null)
    : [];
  return {
    id,
    title: String(row.title ?? ""),
    health: typeof row.health === "string" ? row.health : undefined,
    health_label: typeof row.health_label === "string" ? row.health_label : undefined,
    empty: typeof row.empty === "boolean" ? row.empty : undefined,
    modules,
  };
}

function asLessonsByType(value: unknown): LessonsByType {
  const row = asRecord(value);
  const num = (key: string) => {
    const n = Number(row[key]);
    return Number.isFinite(n) ? n : 0;
  };
  return {
    video: num("video"),
    presentation: num("presentation"),
    guide: num("guide"),
    test: num("test"),
  };
}

export function normalizeSystemHealth(data: unknown): SystemHealth {
  const root = asRecord(unwrapApiPayload(data));
  const contentRaw =
    root.content && typeof root.content === "object" && !Array.isArray(root.content)
      ? asRecord(root.content)
      : root;
  const directions = Array.isArray(contentRaw.directions)
    ? contentRaw.directions.map(asHealthDirection).filter((item): item is HealthDirectionNode => item !== null)
    : [];
  const hasContent =
    directions.length > 0 ||
    contentRaw.directions_total != null ||
    contentRaw.lessons_total != null ||
    contentRaw.modules_total != null;

  const content: SystemContentHealth | undefined = hasContent
    ? {
        directions_total: Number(contentRaw.directions_total) || directions.length,
        modules_total: Number(contentRaw.modules_total) || 0,
        lessons_total: Number(contentRaw.lessons_total) || 0,
        lessons_by_type: asLessonsByType(contentRaw.lessons_by_type),
        empty_directions: Number(contentRaw.empty_directions) || 0,
        empty_modules: Number(contentRaw.empty_modules) || 0,
        lessons_without_content: Number(contentRaw.lessons_without_content) || 0,
        health: typeof contentRaw.health === "string" ? contentRaw.health : "ok",
        health_label: typeof contentRaw.health_label === "string" ? contentRaw.health_label : undefined,
        directions,
      }
    : undefined;

  return {
    database: String(root.database ?? ""),
    table_count: Number(root.table_count) || 0,
    migration_version: Number(root.migration_version) || 0,
    migration_dirty: Boolean(root.migration_dirty),
    health: typeof root.health === "string" ? root.health : content?.health,
    health_label: typeof root.health_label === "string" ? root.health_label : content?.health_label,
    content,
  };
}

export async function getSystemHealth() {
  const data = await apiRequest<unknown>("/admin/it/system/health");
  return normalizeSystemHealth(data);
}

export async function getItCategories(): Promise<ItCategory[]> {
  const data = await apiRequest<unknown>("/admin/it/categories");
  const items: ItCategory[] = [];
  for (const item of asList<unknown>(data, ["items", "categories"])) {
    const row = asRecord(item);
    const id = parsePositiveInt(row.id) ?? parsePositiveInt(row.value);
    if (!id) continue;
    items.push({
      id,
      title: String(row.name ?? row.title ?? row.label ?? `Kategoriya #${id}`),
      slug: typeof row.slug === "string" ? row.slug : undefined,
    });
  }
  return items;
}

function silentGet(silentAuth?: boolean): ApiRequestOptions {
  return silentAuth ? { skipAuthRedirect: true } : {};
}

export async function getItDirectionsPage(query?: ItListQuery, silentAuth = false) {
  const data = await apiRequest<unknown>(`/admin/it/directions${listQuery(query)}`, silentGet(silentAuth));
  return pagedEntities(data, ["items", "directions"], normalizeItDirection, (item) => Boolean(item.id));
}

export async function getItDirections(query?: ItListQuery, silentAuth = false) {
  const page = await getItDirectionsPage(query, silentAuth);
  return page.items;
}

export async function getItCoursesPage(query?: ItListQuery, silentAuth = false) {
  const data = await apiRequest<unknown>(`/admin/it/courses${listQuery(query)}`, silentGet(silentAuth));
  return pagedEntities(data, ["items", "courses"], normalizeItCourse, (item) => Boolean(item.id));
}

export async function getItCourses(query?: ItListQuery, silentAuth = false) {
  const page = await getItCoursesPage(query, silentAuth);
  return page.items;
}

export async function getItCourse(id: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`/admin/it/courses/${id}`, silentGet(silentAuth));
  return normalizeItCourse(data);
}

export async function createItCourse(payload: CreateITCourseRequest) {
  const data = await apiRequest<unknown>("/admin/it/courses", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeItCourse(data);
}

export async function updateItCourse(id: number, payload: CreateITCourseRequest) {
  const data = await apiRequest<unknown>(`/admin/it/courses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeItCourse(data);
}

export async function deleteItCourse(id: number) {
  return apiRequest<unknown>(`/admin/it/courses/${id}`, { method: "DELETE" });
}

export async function createItCourseModule(courseId: number, payload: CreateItModuleRequest) {
  const data = await apiRequest<unknown>(`/admin/it/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return asModule(unwrapApiPayload(data));
}

export async function getItDirection(id: number, silentAuth = false) {
  const data = await apiRequest<unknown>(`/admin/it/directions/${id}`, silentGet(silentAuth));
  return normalizeItDirection(data);
}

export async function createItDirection(payload: CreateItDirectionRequest) {
  const data = await apiRequest<unknown>("/admin/it/directions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeItDirection(data);
}

export async function updateItDirection(id: number, payload: CreateItDirectionRequest) {
  const data = await apiRequest<unknown>(`/admin/it/directions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeItDirection(data);
}

export async function deleteItDirection(id: number) {
  return apiRequest<unknown>(`/admin/it/directions/${id}`, { method: "DELETE" });
}

export async function createItModule(directionId: number, payload: CreateItModuleRequest) {
  const data = await apiRequest<unknown>(`/admin/it/directions/${directionId}/modules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return asModule(unwrapApiPayload(data));
}

export async function updateItModule(id: number, payload: CreateItModuleRequest) {
  const data = await apiRequest<unknown>(`/admin/it/modules/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return asModule(unwrapApiPayload(data));
}

export async function deleteItModule(id: number) {
  return apiRequest<unknown>(`/admin/it/modules/${id}`, { method: "DELETE" });
}

export async function createItLesson(moduleId: number, payload: CreateItLessonRequest) {
  const data = await apiRequest<unknown>(`/admin/it/modules/${moduleId}/lessons`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return asLesson(unwrapApiPayload(data));
}

export async function updateItLesson(id: number, payload: CreateItLessonRequest) {
  const data = await apiRequest<unknown>(`/admin/it/lessons/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return asLesson(unwrapApiPayload(data));
}

export async function deleteItLesson(id: number) {
  return apiRequest<unknown>(`/admin/it/lessons/${id}`, { method: "DELETE" });
}

export async function createItLessonMaterial(lessonId: number, payload: CreateItMaterialRequest) {
  const data = await apiRequest<unknown>(`/admin/it/lessons/${lessonId}/materials`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return asMaterial(unwrapApiPayload(data));
}

export async function updateItMaterial(id: number, payload: CreateItMaterialRequest) {
  const data = await apiRequest<unknown>(`/admin/it/materials/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return asMaterial(unwrapApiPayload(data));
}

export async function deleteItMaterial(id: number) {
  return apiRequest<unknown>(`/admin/it/materials/${id}`, { method: "DELETE" });
}

export async function createItLessonAssignment(lessonId: number, payload: CreateItAssignmentRequest) {
  const data = await apiRequest<unknown>(`/admin/it/lessons/${lessonId}/assignments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return asAssignment(unwrapApiPayload(data));
}

export async function updateItAssignment(id: number, payload: CreateItAssignmentRequest) {
  const data = await apiRequest<unknown>(`/admin/it/assignments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return asAssignment(unwrapApiPayload(data));
}

export async function deleteItAssignment(id: number) {
  return apiRequest<unknown>(`/admin/it/assignments/${id}`, { method: "DELETE" });
}

export async function createItModuleMaterial(moduleId: number, payload: CreateItMaterialRequest) {
  const data = await apiRequest<unknown>(`/admin/it/modules/${moduleId}/materials`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return asMaterial(unwrapApiPayload(data));
}

// ─── IT Test endpointlari ────────────────────────────────────────────────────

function asItTestQuestion(data: unknown): ItTestQuestion | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id) ?? pickEntityId(data);
  if (!id) return null;
  const answers = Array.isArray(row.answers)
    ? (row.answers as unknown[]).map((a) => {
        const ar = asRecord(a);
        return {
          id: parsePositiveInt(ar.id) ?? undefined,
          answer: String(ar.answer ?? ar.text ?? ""),
          is_correct: Boolean(ar.is_correct),
        };
      })
    : [];
  return {
    id,
    test_id: parsePositiveInt(row.test_id) ?? undefined,
    question: String(row.question ?? ""),
    question_type: typeof row.question_type === "string" ? row.question_type : undefined,
    sort_order: parsePositiveInt(row.sort_order) ?? undefined,
    answers,
  };
}

function asItTest(data: unknown): ItTest | null {
  const row = asRecord(data);
  const id = parsePositiveInt(row.id) ?? pickEntityId(data);
  if (!id) return null;
  const questions = Array.isArray(row.questions)
    ? row.questions.map(asItTestQuestion).filter((q): q is ItTestQuestion => q !== null)
    : undefined;
  return {
    id,
    lesson_id: parsePositiveInt(row.lesson_id) ?? undefined,
    title: typeof row.title === "string" ? row.title : undefined,
    passing_score: parsePositiveInt(row.passing_score) ?? undefined,
    duration_minutes: parsePositiveInt(row.duration_minutes) ?? undefined,
    attempt_limit: parsePositiveInt(row.attempt_limit) ?? undefined,
    questions,
  };
}

/** GET /admin/it/lessons/{id}/tests */
export async function getItLessonTests(lessonId: number): Promise<ItTest[]> {
  const data = await apiRequest<unknown>(`/admin/it/lessons/${lessonId}/tests`);
  return asList<unknown>(data, ["items", "tests"])
    .map(asItTest)
    .filter((t): t is ItTest => t !== null);
}

/** POST /admin/it/lessons/{id}/tests */
export async function createItLessonTest(lessonId: number, payload: CreateItTestPayload): Promise<ItTest> {
  const data = await apiRequest<unknown>(`/admin/it/lessons/${lessonId}/tests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const test = asItTest(unwrapApiPayload(data));
  if (!test) throw new ApiError(500, "IT Test ID qaytmadi");
  return test;
}

/** GET /admin/it/tests/{id} */
export async function getItTest(id: number): Promise<ItTest> {
  const data = await apiRequest<unknown>(`/admin/it/tests/${id}`);
  const test = asItTest(unwrapApiPayload(data));
  if (!test) throw new ApiError(500, "IT Test topilmadi");
  return test;
}

/** DELETE /admin/it/tests/{id} */
export async function deleteItTest(id: number) {
  return apiRequest<unknown>(`/admin/it/tests/${id}`, { method: "DELETE" });
}

/** GET /admin/it/tests/{id}/questions */
export async function getItTestQuestions(testId: number): Promise<ItTestQuestion[]> {
  const data = await apiRequest<unknown>(`/admin/it/tests/${testId}/questions`);
  return asList<unknown>(data, ["items", "questions"])
    .map(asItTestQuestion)
    .filter((q): q is ItTestQuestion => q !== null);
}

/** POST /admin/it/tests/{id}/questions */
export async function createItTestQuestion(
  testId: number,
  payload: CreateItTestQuestionPayload
): Promise<ItTestQuestion> {
  const data = await apiRequest<unknown>(`/admin/it/tests/${testId}/questions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const question = asItTestQuestion(unwrapApiPayload(data));
  if (!question) throw new ApiError(500, "IT Test savoli ID qaytmadi");
  return question;
}

/**
 * POST /admin/it/tests/upload — to'g'ridan backend URL (proxy 503 oldini olish).
 * Test savollarini fayl (CSV/Excel) orqali ommaviy yuklash.
 */
export async function uploadItTestFile(lessonId: number, file: File): Promise<ItTest[]> {
  const form = new FormData();
  form.append("file", file);
  form.append("lesson_id", String(lessonId));
  // apiUpload → NEXT_PUBLIC_API_URL / API_URL (proxy emas)
  const data = await apiUpload<unknown>("/admin/it/tests/upload", form);
  return asList<unknown>(data, ["items", "tests"])
    .map(asItTest)
    .filter((t): t is ItTest => t !== null);
}

/**
 * IT dars uchun test yaratish: bitta test + barcha savollar.
 * MaterialFormData (TestMaterialForm) dan chaqiriladi.
 */
export async function createItLessonTestWithQuestions(
  lessonId: number,
  item: MaterialFormData
): Promise<{ id: number }> {
  const payload = {
    title: item.title.trim() || "Test",
    passing_score: item.passingScore ?? 70,
    duration_minutes: item.durationMinutes ?? 30,
    attempt_limit: item.attempts ?? 2,
  };
  console.log("ADMIN IT TEST SAVE lessonId:", lessonId);
  console.log("ADMIN IT TEST SAVE URL:", `/admin/it/lessons/${lessonId}/tests`);
  console.log("ADMIN IT TEST PAYLOAD:", payload);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("zm_diag_admin_test_lesson_id", String(lessonId));
      window.sessionStorage.setItem("zm_diag_admin_test_saved_at", new Date().toISOString());
    } catch {
      /* ignore */
    }
  }

  const test = await createItLessonTest(lessonId, payload);

  console.log("ADMIN IT TEST SAVE response testId:", test.id);
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem("zm_diag_admin_test_id", String(test.id));
    } catch {
      /* ignore */
    }
  }
  try {
    const { invalidateLearningCache } = await import("@/lib/api/learning");
    invalidateLearningCache(undefined, lessonId);
  } catch {
    /* ignore */
  }

  for (const [index, question] of (item.questions ?? []).entries()) {
    await createItTestQuestion(test.id, {
      question: question.question.trim(),
      question_type: "single_choice",
      sort_order: index + 1,
      answers: question.options.map((opt) => ({
        answer: opt.text.trim(),
        is_correct: opt.key === question.correctAnswer,
      })),
    });
  }

  return { id: test.id };
}
