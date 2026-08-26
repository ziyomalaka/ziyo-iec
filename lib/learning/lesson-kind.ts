import type { CourseDetailResponse } from "@/lib/api/types/courses";
import type { LearningCourseResponse, LearningLessonSummary } from "@/lib/api/types/learning";

export type SidebarLessonKind = "THEORY" | "PRACTICAL" | "TEST";

const KIND_STORE_KEY = "ziyo-lesson-kinds";
const KIND_PREFIX = "ZM_KIND:";

function tokens(lesson: {
  lesson_type?: string;
  item_type?: string;
  item_type_label?: string;
  lesson_type_label?: string;
  description?: string;
}) {
  return [lesson.lesson_type, lesson.lesson_type_label, lesson.item_type, lesson.item_type_label]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
}

function normTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function mapStoredLessonKind(value?: string | null): "THEORY" | "PRACTICAL" | undefined {
  const raw = String(value ?? "").trim().toUpperCase();
  if (raw === "THEORY" || raw === "NAZARIY") return "THEORY";
  if (raw === "PRACTICAL" || raw === "PRACTICE" || raw === "AMALIY") return "PRACTICAL";
  return undefined;
}

export function withLessonKindMarker(kind: "THEORY" | "PRACTICAL", description?: string) {
  const body = stripLessonKindMarker(description);
  return body ? `${KIND_PREFIX}${kind}\n${body}` : `${KIND_PREFIX}${kind}`;
}

export function stripLessonKindMarker(description?: string | null) {
  return String(description ?? "").replace(/^ZM_KIND:(THEORY|PRACTICAL)\n?/, "").trim();
}

export function lessonKindFromDescription(description?: string | null) {
  const match = String(description ?? "").match(/^ZM_KIND:(THEORY|PRACTICAL)/);
  return match ? mapStoredLessonKind(match[1]) : undefined;
}

export function resolveLessonKind(lesson: {
  lesson_type?: string;
  item_type?: string;
  item_type_label?: string;
  lesson_type_label?: string;
  description?: string;
}): SidebarLessonKind | null {
  const stored =
    mapStoredLessonKind(lesson.lesson_type) ??
    mapStoredLessonKind(lesson.lesson_type_label) ??
    lessonKindFromDescription(lesson.description);
  if (stored) return stored;
  const values = tokens(lesson);
  // Testlar tests[] / has_tests da — item_type==="test" dars turini TEST qilmasin
  if (values.some((value) => value === "practical" || value === "practice" || value === "amaliy" || value === "praktika")) {
    return "PRACTICAL";
  }
  if (values.some((value) => value === "theory" || value === "nazariy")) return "THEORY";
  return null;
}

export function lessonKindLabel(kind: SidebarLessonKind) {
  if (kind === "PRACTICAL") return "Amaliy";
  if (kind === "TEST") return "Test";
  return "Nazariy";
}

function readKindStore(): Record<string, "THEORY" | "PRACTICAL"> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KIND_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const store: Record<string, "THEORY" | "PRACTICAL"> = {};
    for (const [key, value] of Object.entries(parsed)) {
      const kind = mapStoredLessonKind(typeof value === "string" ? value : null);
      if (kind) store[key] = kind;
    }
    return store;
  } catch {
    return {};
  }
}

export function rememberLessonKind(lessonId: number | undefined, title: string, kind: "THEORY" | "PRACTICAL") {
  if (typeof window === "undefined") return;
  const store = readKindStore();
  if (lessonId) store[`id:${lessonId}`] = kind;
  const titleKey = normTitle(title);
  if (titleKey) store[`title:${titleKey}`] = kind;
  window.localStorage.setItem(KIND_STORE_KEY, JSON.stringify(store));
}

export function recalledLessonKind(lessonId?: number, title?: string): "THEORY" | "PRACTICAL" | null {
  const store = readKindStore();
  if (lessonId && store[`id:${lessonId}`]) return store[`id:${lessonId}`];
  const titleKey = title ? normTitle(title) : "";
  if (titleKey && store[`title:${titleKey}`]) return store[`title:${titleKey}`];
  return null;
}

export function kindFromMaterials(materials?: Array<{ material_type?: string; type?: string }>) {
  const types = (materials ?? []).map((item) => String(item.material_type ?? item.type ?? "").toLowerCase());
  if (types.some((type) => type.includes("lab") || type === "seminar" || type === "practical" || type === "amaliy")) {
    return "PRACTICAL" as const;
  }
  return null;
}

export function sidebarLessonKind(lesson: {
  id?: number;
  title?: string;
  lesson_type?: string;
  item_type?: string;
  item_type_label?: string;
  lesson_type_label?: string;
  description?: string;
  materials?: Array<{ material_type?: string; type?: string }>;
}): SidebarLessonKind {
  const stored =
    resolveLessonKind(lesson) ??
    recalledLessonKind(lesson.id, lesson.title) ??
    kindFromMaterials(lesson.materials);
  if (stored) return stored;
  // Test mavjudligi has_tests/test_count — item_type==="test" bilan dars turini almashtirmaymiz
  return "THEORY";
}

export function overlayLearningCourseKinds(
  course: LearningCourseResponse,
  catalog?: Pick<CourseDetailResponse, "modules"> | null
): LearningCourseResponse {
  const byId = new Map<number, SidebarLessonKind>();
  const byTitle = new Map<string, SidebarLessonKind>();
  for (const module of catalog?.modules ?? []) {
    for (const lesson of module.lessons ?? []) {
      const kind = resolveLessonKind(lesson) ?? kindFromMaterials(lesson.materials);
      if (!kind) continue;
      byId.set(lesson.id, kind);
      const title = normTitle(lesson.title);
      if (title) byTitle.set(title, kind);
    }
  }

  const patch = (lesson: LearningLessonSummary): LearningLessonSummary => ({
    ...lesson,
    lesson_type: sidebarLessonKind({
      ...lesson,
      lesson_type:
        mapStoredLessonKind(lesson.lesson_type) ??
        byId.get(lesson.id) ??
        byTitle.get(normTitle(lesson.title)) ??
        lesson.lesson_type,
    }),
  });

  return {
    ...course,
    modules: (course.modules ?? []).map((module) => ({
      ...module,
      lessons: (module.lessons ?? []).map(patch),
      items: module.items?.map(patch),
    })),
  };
}
