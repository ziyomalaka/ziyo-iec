import { pickFileUrl } from "@/lib/api/media";
import { fileKindFromUrl } from "@/lib/learning/file-kind";
import type { LearningAssignment, LearningLessonDetail, LearningMaterial } from "@/lib/api/types/learning";

export type LessonMaterialTab = "presentation" | "lecture" | "seminar" | "laboratory" | "test";

export const LESSON_MATERIAL_TABS: { id: LessonMaterialTab; label: string }[] = [
  { id: "presentation", label: "Taqdimot" },
  { id: "lecture", label: "Ma'ruza matni" },
  { id: "seminar", label: "Seminar" },
  { id: "laboratory", label: "Laboratoriya" },
  { id: "test", label: "Test" },
];

export type ParsedMaterialBody = {
  text?: string;
  goal?: string;
  procedure?: string;
  assignment?: string;
  instruction?: string;
};

export function materialKind(
  item: Pick<LearningMaterial, "type" | "material_type" | "url" | "file_url" | "content_url" | "original_name" | "title">
): LessonMaterialTab | "video" | null {
  const type = String(item.material_type || item.type || "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");

  if (type) {
    if (type === "video" || type.includes("video")) return "video";
    if (type === "presentation" || type.includes("presentation") || type === "pptx" || type === "ppt") {
      return "presentation";
    }
    if (type === "lecture" || type === "guide" || type === "maruza" || type.includes("lecture")) {
      return "lecture";
    }
    if (type === "seminar" || type.includes("seminar")) return "seminar";
    if (type === "laboratory" || type === "lab" || type.includes("laborator")) return "laboratory";
    if (type === "test" || type.includes("test")) return "test";
    if (type === "pdf" || type === "word" || type === "docx" || type === "excel" || type === "xlsx" || type === "xls") {
      return "lecture";
    }
  }

  const path = pickFileUrl(item) || item.original_name || item.title || "";
  const fileKind = fileKindFromUrl(path);
  if (fileKind === "video") return "video";
  if (fileKind === "office") {
    return path.toLowerCase().includes(".ppt") ? "presentation" : "lecture";
  }
  if (fileKind === "pdf" || fileKind === "word" || fileKind === "text" || fileKind === "image") return "lecture";
  if (path.trim()) return "lecture";
  return null;
}

export function parseMaterialBody(text?: string): ParsedMaterialBody {
  const raw = text?.trim() ?? "";
  if (!raw) return {};

  const labels = [
    ["goal", "Maqsad"],
    ["procedure", "Bajarish tartibi"],
    ["assignment", "Topshiriq"],
    ["instruction", "Ko'rsatma"],
  ] as const;

  const found: { key: keyof ParsedMaterialBody; index: number; label: string }[] = [];
  for (const [key, label] of labels) {
    const index = raw.search(new RegExp(`(?:^|\\n)${label}\\s*:`, "i"));
    if (index >= 0) found.push({ key, index, label });
  }
  if (!found.length) return { text: raw };

  found.sort((a, b) => a.index - b.index);
  const body: ParsedMaterialBody = {};
  const first = found[0].index;
  if (first > 0) body.text = raw.slice(0, first).trim() || undefined;

  for (let i = 0; i < found.length; i++) {
    const current = found[i];
    const end = i + 1 < found.length ? found[i + 1].index : raw.length;
    const chunk = raw.slice(current.index, end).replace(new RegExp(`^\\s*${current.label}\\s*:\\s*`, "i"), "").trim();
    if (chunk) body[current.key] = chunk;
  }
  return body;
}

export function materialsForTab(lesson: LearningLessonDetail, tab: LessonMaterialTab): LearningMaterial[] {
  const all = lesson.materials ?? [];
  const listed = all.filter((item) => materialKind(item) === tab);

  // Hech qayerga tushmagan faylli materiallar — Ma'ruza tabiga
  if (tab === "lecture") {
    for (const item of all) {
      if (materialKind(item) !== null) continue;
      const path = pickFileUrl(item);
      if (!path && !item.content_text?.trim()) continue;
      if (!listed.some((row) => row.id === item.id)) listed.push(item);
    }
  }

  if (tab === "lecture" && !listed.length && (lesson.content_text?.trim() || lesson.content_url?.trim())) {
    listed.push({
      id: 0,
      type: "lecture",
      material_type: "lecture",
      title: "Ma'ruza matni",
      content_text: lesson.content_text,
      file_url: lesson.content_url,
      url: lesson.content_url,
    });
  }

  if (
    tab === "test" &&
    !listed.length &&
    (lesson.has_tests === true ||
      (lesson.test_count ?? 0) > 0 ||
      (lesson.tests?.length ?? 0) > 0)
  ) {
    listed.push({
      id: lesson.tests?.[0]?.id ?? lesson.id,
      type: "test",
      material_type: "test",
      title: lesson.tests?.[0]?.title || lesson.title,
      content_text: lesson.content_text || lesson.about || lesson.description,
    });
  }

  return listed;
}

export function assignmentsForSeminar(lesson: LearningLessonDetail): LearningAssignment[] {
  return lesson.assignments ?? [];
}
