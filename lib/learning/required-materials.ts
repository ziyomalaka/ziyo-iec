import { lessonVideoUrl } from "@/lib/api/learning";
import type { LearningLessonDetail, LearningMaterial } from "@/lib/api/types/learning";
import {
  LESSON_MATERIAL_TABS,
  assignmentsForSeminar,
  materialKind,
  materialsForTab,
  type LessonMaterialTab,
} from "@/lib/learning/material-tabs";

/** Darsdagi majburiy material (testdan oldin). Faqat backendda mavjudlari. */
export type RequiredLessonMaterial = {
  /** Stabil kalit: `video` | `material:{id}` | `seminar-asg:{id}` */
  key: string;
  kind: "video" | LessonMaterialTab;
  label: string;
  title: string;
  materialId?: number;
};

const KIND_ORDER: Array<"video" | LessonMaterialTab> = [
  "video",
  "presentation",
  "lecture",
  "seminar",
  "laboratory",
];

const KIND_LABEL: Record<string, string> = {
  video: "Video",
  presentation: "Taqdimot",
  lecture: "Ma'ruza matni",
  seminar: "Seminar",
  laboratory: "Laboratoriya",
};

/**
 * Backenddagi mavjud materiallardan majburiy ro'yxat.
 * Hardcode "hammasi majburiy" EMAS — yo'q materiallar skip.
 * Test bu ro'yxatga kirmaydi (test alohida ochiladi).
 */
export function listRequiredMaterials(lesson: LearningLessonDetail): RequiredLessonMaterial[] {
  const out: RequiredLessonMaterial[] = [];
  const seen = new Set<string>();

  const push = (item: RequiredLessonMaterial) => {
    if (seen.has(item.key)) return;
    seen.add(item.key);
    out.push(item);
  };

  // 1. Video — faqat URL mavjud bo'lsa
  const videoUrl = lessonVideoUrl(lesson)?.trim();
  if (videoUrl) {
    const videoMat = (lesson.materials ?? []).find((m) => materialKind(m) === "video");
    push({
      key: videoMat?.id ? `material:${videoMat.id}` : `video:${lesson.id}`,
      kind: "video",
      label: KIND_LABEL.video,
      title: videoMat?.title || "Dars videosi",
      materialId: videoMat?.id,
    });
  }

  // 2–5. Taqdimot → Ma'ruza → Seminar → Laboratoriya
  for (const kind of KIND_ORDER) {
    if (kind === "video") continue;
    const items = materialsForTab(lesson, kind);
    for (const item of items) {
      if (materialKind(item) === "test") continue;
      const id = item.id;
      if (!id && !pickContent(item)) continue;
      push({
        key: id ? `material:${id}` : `${kind}:${lesson.id}:${item.title ?? "x"}`,
        kind,
        label: KIND_LABEL[kind] ?? kind,
        title: item.title || KIND_LABEL[kind] || kind,
        materialId: id,
      });
    }
    if (kind === "seminar") {
      for (const asg of assignmentsForSeminar(lesson)) {
        if (!asg.id && !asg.title) continue;
        push({
          key: asg.id ? `seminar-asg:${asg.id}` : `seminar-asg:${lesson.id}:${asg.title}`,
          kind: "seminar",
          label: KIND_LABEL.seminar,
          title: asg.title || "Seminar topshirig'i",
          materialId: asg.id,
        });
      }
    }
  }

  // Tartib: video → presentation → lecture → seminar → laboratory
  return out.sort(
    (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
}

function pickContent(item: LearningMaterial) {
  return Boolean(
    item.file_url ||
      item.url ||
      item.content_url ||
      item.content_text?.trim() ||
      item.storage_path
  );
}

/** Faqat kontenti bor tablar — bo'sh tabni UI da yashirish uchun */
export function visibleMaterialTabs(lesson: LearningLessonDetail): LessonMaterialTab[] {
  return LESSON_MATERIAL_TABS.map((t) => t.id).filter((id) => {
    if (id === "test") {
      return (
        lesson.has_tests === true ||
        (lesson.test_count ?? 0) > 0 ||
        (lesson.tests?.length ?? 0) > 0 ||
        materialsForTab(lesson, "test").length > 0
      );
    }
    if (id === "seminar") {
      return materialsForTab(lesson, id).length > 0 || assignmentsForSeminar(lesson).length > 0;
    }
    return materialsForTab(lesson, id).length > 0;
  });
}

export function allRequiredCompleted(
  required: RequiredLessonMaterial[],
  completedKeys: Iterable<string>
): boolean {
  if (!required.length) return true;
  const set = completedKeys instanceof Set ? completedKeys : new Set(completedKeys);
  return required.every((r) => set.has(r.key));
}

export function lessonHasTest(lesson: LearningLessonDetail): boolean {
  return (
    lesson.has_tests === true ||
    (lesson.test_count ?? 0) > 0 ||
    (lesson.tests?.length ?? 0) > 0 ||
    (lesson.materials ?? []).some((m) => materialKind(m) === "test")
  );
}

/** Student test urinishlari — FE limity (backend ham tekshirishi kerak) */
export const MAX_LESSON_TEST_ATTEMPTS = 2;
