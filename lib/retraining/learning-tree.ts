/**
 * Qayta tayyorlash o'quv daraxti: YO'NALISH → BLOK → MODUL → DARS → MATERIALLAR.
 *
 * BLOCK BACKEND SUPPORT: AVAILABLE faqat real `blocks[]` / `module.block_id`
 * yoki student katalogidagi shu fieldlar bo'lsa. Fake block_id ixtiro qilinmaydi.
 */
import type { CourseDetailResponse } from "@/lib/api/types/courses";
import type {
  LearningBlock,
  LearningCourseResponse,
  LearningLessonDetail,
  LearningLessonSummary,
  LearningMaterial,
  LearningModule,
} from "@/lib/api/types/learning";
import type { RetrainingDirectionThumb } from "@/lib/retraining/direction-snapshot";
import { lessonVideoUrl } from "@/lib/api/learning";
import { pickFileUrl } from "@/lib/api/media";
import {
  canOpenLesson,
  flattenLearningLessons,
  resolveLessonProgressStatus,
  toLessonUiState,
  type LessonUiState,
} from "@/lib/learning/lesson-progress";
import { MODULE_BLOCK_PREFIX, parseBlockMeta } from "@/lib/retraining/content-blocks";
import { toRoman } from "@/lib/retraining/roman";
import {
  normalizeMaterialType,
  retrainingMaterialLabel,
  type RetrainingMaterialType,
} from "@/lib/retraining/material-types";

function moduleBlockIdFromDescription(description?: string | null) {
  const match = String(description ?? "").match(MODULE_BLOCK_PREFIX);
  if (!match?.[1]) return null;
  const id = Number(match[1]);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export type BlockBackendSupport = "AVAILABLE" | "MISSING";

export type LearningTreeBlock = {
  id: number;
  title: string;
  block_number: number;
  modules: LearningModule[];
};

export type RetrainingLearningTreeModel = {
  directionId: number;
  directionTitle: string;
  progressPercent: number;
  blockSupport: BlockBackendSupport;
  blocks: LearningTreeBlock[];
  unassignedModules: LearningModule[];
};

export type TreeLessonMaterial = {
  key: string;
  materialId?: number;
  type: RetrainingMaterialType;
  title: string;
  href?: string;
  contentText?: string;
  mimeType?: string;
  originalName?: string;
};

function moduleLessons(module: LearningModule): LearningLessonSummary[] {
  return module.lessons ?? module.items ?? [];
}

type ModuleGroupingHint = {
  id: number;
  description?: string;
  block_id?: number;
};

function preferTaggedDescription(...values: Array<string | undefined>) {
  const list = values.filter((item): item is string => Boolean(item?.trim()));
  return list.find((item) => parseBlockMeta(item).length > 0) ?? list[0];
}

function preferModuleDescription(...values: Array<string | undefined>) {
  const list = values.filter((item): item is string => Boolean(item?.trim()));
  return list.find((item) => moduleBlockIdFromDescription(item)) ?? list[0];
}

function mergeModuleHint(target: Map<number, ModuleGroupingHint>, item?: ModuleGroupingHint | null) {
  if (!item || !(item.id > 0)) return;
  const prev = target.get(item.id);
  target.set(item.id, {
    id: item.id,
    description: preferModuleDescription(item.description, prev?.description),
    block_id:
      item.block_id && item.block_id > 0 ? item.block_id : prev?.block_id && prev.block_id > 0 ? prev.block_id : undefined,
  });
}

export function overlayRetrainingBlockGrouping(
  learning: LearningCourseResponse,
  catalog?: CourseDetailResponse | null,
  published?: RetrainingDirectionThumb | null
): LearningCourseResponse {
  const catalogBlocks = (catalog?.blocks ?? []).filter((item) => item.id > 0);
  const learningBlocks = (learning.blocks ?? []).filter((item) => item.id > 0);
  const blocks: LearningBlock[] = learningBlocks.length
    ? learningBlocks
    : catalogBlocks.map((item) => ({
        id: item.id,
        title: item.title,
        order_index: item.order_index,
        block_number: item.block_number,
      }));

  const hints = new Map<number, ModuleGroupingHint>();
  for (const item of catalog?.modules ?? []) {
    mergeModuleHint(hints, { id: item.id, description: item.description, block_id: item.block_id });
  }
  for (const block of catalogBlocks) {
    for (const item of block.modules ?? []) {
      mergeModuleHint(hints, {
        id: item.id,
        description: item.description,
        block_id: item.block_id ?? block.id,
      });
    }
  }
  for (const item of published?.modules ?? []) {
    mergeModuleHint(hints, { id: item.id, description: item.description });
  }

  const modules = (learning.modules ?? []).map((item) => {
    const hint = hints.get(item.id);
    return {
      ...item,
      description: preferModuleDescription(item.description, hint?.description),
      block_id: item.block_id ?? hint?.block_id,
    };
  });

  const hasApiBlocks =
    learning.block_backend_support === true ||
    learningBlocks.length > 0 ||
    catalogBlocks.length > 0 ||
    modules.some((item) => typeof item.block_id === "number" && item.block_id > 0);

  return {
    ...learning,
    description: preferTaggedDescription(learning.description, catalog?.description, published?.description),
    modules,
    blocks: blocks.length ? blocks : undefined,
    block_backend_support: hasApiBlocks || undefined,
  };
}

export function blockBackendSupportOf(course: LearningCourseResponse): BlockBackendSupport {
  if (course.block_backend_support) return "AVAILABLE";
  if ((course.blocks ?? []).some((item) => item.id > 0)) return "AVAILABLE";
  if ((course.modules ?? []).some((item) => typeof item.block_id === "number" && item.block_id > 0)) {
    return "AVAILABLE";
  }
  return "MISSING";
}

export function buildRetrainingLearningTree(course: LearningCourseResponse): RetrainingLearningTreeModel {
  const modules = [...(course.modules ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.id - b.id
  );
  const support = blockBackendSupportOf(course);
  const apiBlocks = (course.blocks ?? []).filter((item) => item.id > 0);
  const metaBlocks = parseBlockMeta(course.description);
  const sourceBlocks: Array<{ id: number; title: string; block_number: number }> = apiBlocks.length
    ? apiBlocks.map((item, index) => ({
        id: item.id,
        title: item.title,
        block_number: item.block_number ?? item.order_index ?? index + 1,
      }))
    : metaBlocks.length
      ? metaBlocks.map((item) => ({
          id: item.id,
          title: item.title,
          block_number: item.block_number,
        }))
      : modules.length
        ? [{ id: 1, title: "Asosiy blok", block_number: 1 }]
        : [];

  const grouped = new Map<number, LearningModule[]>();
  for (const block of sourceBlocks) grouped.set(block.id, []);

  const fallbackBlockId = sourceBlocks[0]?.id ?? null;
  for (const item of modules) {
    const fromApi = item.block_id && item.block_id > 0 ? item.block_id : null;
    const fromMeta = moduleBlockIdFromDescription(item.description);
    const blockId = fromApi ?? fromMeta;
    if (blockId && grouped.has(blockId)) {
      grouped.get(blockId)!.push(item);
    } else if (blockId && !grouped.has(blockId)) {
      grouped.set(blockId, [item]);
      sourceBlocks.push({
        id: blockId,
        title: "",
        block_number: sourceBlocks.length + 1,
      });
    } else if (fallbackBlockId) {
      grouped.get(fallbackBlockId)!.push(item);
    }
  }

  const namedIds = new Set(
    [...apiBlocks, ...metaBlocks].map((item) => item.id).filter((id) => id > 0)
  );
  const blocks = sourceBlocks
    .map((block) => ({
      id: block.id,
      title: block.title,
      block_number: block.block_number,
      modules: grouped.get(block.id) ?? [],
    }))
    .filter((block) => block.modules.length > 0 || namedIds.has(block.id))
    .sort((a, b) => a.block_number - b.block_number || a.id - b.id);

  const tree: RetrainingLearningTreeModel = {
    directionId: course.course_id ?? course.id,
    directionTitle: course.title,
    progressPercent: 0,
    blockSupport: support,
    blocks,
    unassignedModules: [],
  };
  tree.progressPercent = treeProgressPercent(tree, course.progress_percent);
  return tree;
}

export function treeLessonStatus(lesson: LearningLessonSummary): LessonUiState {
  if (lesson.is_completed || lesson.completed || String(lesson.status ?? "").toLowerCase() === "completed") {
    return "completed";
  }
  return toLessonUiState(resolveLessonProgressStatus(lesson));
}

export function canReviewLesson(lesson: LearningLessonSummary) {
  if (treeLessonStatus(lesson) === "completed") return true;
  return canOpenLesson(resolveLessonProgressStatus(lesson));
}

export function lessonStatusCaption(status: LessonUiState) {
  if (status === "completed") return "Tugallangan";
  if (status === "current") return "Joriy";
  if (status === "locked") return "Yopiq";
  return "Mavjud";
}

export function moduleProgress(module: LearningModule) {
  const lessons = moduleLessons(module);
  const done = lessons.filter((item) => treeLessonStatus(item) === "completed").length;
  return { done, total: lessons.length };
}

export function blockProgress(block: LearningTreeBlock) {
  const total = block.modules.length;
  const done = block.modules.filter((item) => {
    const progress = moduleProgress(item);
    return progress.total > 0 && progress.done === progress.total;
  }).length;
  return { done, total };
}

export function treeProgressPercent(tree: RetrainingLearningTreeModel, _backendPercent?: number) {
  const lessons = flattenTreeLessons(tree);
  if (!lessons.length) return 0;
  const done = lessons.filter((item) => treeLessonStatus(item) === "completed").length;
  return Math.round((done / lessons.length) * 100);
}

export function displayBlockLabel(block: LearningTreeBlock, index: number) {
  const number = block.block_number > 0 ? block.block_number : index + 1;
  const roman = toRoman(number) || String(number);
  const title = block.title.trim().replace(/^\d+-blok\.?\s*/i, "").trim();
  if (!title) return `${roman}-BLOK`;
  return `${roman}-BLOK. ${title}`;
}

export function displayModuleTitle(module: LearningModule, index: number) {
  const number = module.order_index && module.order_index > 0 ? module.order_index : index + 1;
  const title = module.title
    .trim()
    .replace(/^\d+\s*-?\s*modul\.?\s*/i, "")
    .replace(/^modul\s*\d+\.?\s*/i, "")
    .trim();
  if (!title) return `${number}-modul`;
  return `${number}-modul. ${title}`;
}

export function displayLessonTitle(
  lesson: LearningLessonSummary,
  lessonIndex: number,
  moduleIndex: number
) {
  const code =
    lesson.lesson_code?.replace(/^dars\.?/i, "").trim() ||
    `${moduleIndex + 1}.${lessonIndex + 1}`;
  const title = lesson.title.trim();
  if (/^dars\s*\d/i.test(title)) return title;
  return title ? `Dars ${code} — ${title}` : `Dars ${code}`;
}

export function canExpandLesson(lesson: LearningLessonSummary) {
  return canReviewLesson(lesson);
}

export function flattenTreeLessons(tree: RetrainingLearningTreeModel) {
  return flattenLearningLessons([...tree.blocks.flatMap((block) => block.modules), ...tree.unassignedModules]);
}

function materialTypeOf(item: LearningMaterial): RetrainingMaterialType | null {
  return normalizeMaterialType(item.material_type ?? item.type, "retraining");
}

const TREE_MATERIAL_CAPTION: Record<RetrainingMaterialType, string> = {
  VIDEO: "Video",
  LECTURE: "Ma'ruza matni",
  PRESENTATION: "Taqdimot",
  GUIDE: "Qo'llanma",
  SEMINAR: "Seminar",
  LABORATORY: "Laboratoriya",
  MUSTAQIL_ISH: "Mustaqil ish",
  TEST: "Test",
};

function materialTitle(item: LearningMaterial, type: RetrainingMaterialType) {
  const titled = item.title?.trim();
  if (titled && titled.toLowerCase() !== retrainingMaterialLabel(type).toLowerCase()) return titled;
  return TREE_MATERIAL_CAPTION[type];
}

export function listTreeLessonMaterials(lesson: LearningLessonDetail): TreeLessonMaterial[] {
  const out: TreeLessonMaterial[] = [];
  const seen = new Set<string>();

  const push = (row: TreeLessonMaterial) => {
    if (seen.has(row.key)) return;
    seen.add(row.key);
    out.push(row);
  };

  for (const item of lesson.materials ?? []) {
    const type = materialTypeOf(item);
    if (!type || type === "TEST") continue;
    const href = pickFileUrl(item) || item.url || item.content_url || "";
    if (item.id && item.id > 0) {
      push({
        key: `material:${item.id}`,
        materialId: item.id,
        type,
        title: materialTitle(item, type),
        href: href || undefined,
        contentText: item.content_text,
        mimeType: item.mime_type,
        originalName: item.original_name,
      });
      continue;
    }
    if (href || item.content_text?.trim()) {
      push({
        key: `material:${lesson.id}:${type}:${item.title ?? "x"}`,
        type,
        title: materialTitle(item, type),
        href: href || undefined,
        contentText: item.content_text,
        mimeType: item.mime_type,
        originalName: item.original_name,
      });
    }
  }

  const videoUrl = lessonVideoUrl(lesson)?.trim();
  if (videoUrl && !out.some((item) => item.type === "VIDEO")) {
    push({
      key: `lesson-video:${lesson.id}`,
      type: "VIDEO",
      title: "Video",
      href: videoUrl,
    });
  }

  const order: RetrainingMaterialType[] = [
    "VIDEO",
    "LECTURE",
    "PRESENTATION",
    "GUIDE",
    "SEMINAR",
    "LABORATORY",
    "MUSTAQIL_ISH",
  ];
  return out.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}

export function findLessonTrail(tree: RetrainingLearningTreeModel, lessonId: number | null | undefined) {
  if (!lessonId) return null;
  for (const [blockIndex, block] of tree.blocks.entries()) {
    for (const [moduleIndex, module] of block.modules.entries()) {
      const lessons = module.lessons ?? module.items ?? [];
      const lessonIndex = lessons.findIndex((item) => item.id === lessonId);
      if (lessonIndex >= 0) {
        return { block, blockIndex, module, moduleIndex, lesson: lessons[lessonIndex], lessonIndex };
      }
    }
  }
  return null;
}

export function keysForLesson(tree: RetrainingLearningTreeModel, lessonId: number | null | undefined) {
  const keys: string[] = [`direction:${tree.directionId}`];
  if (!lessonId) return keys;
  for (const block of tree.blocks) {
    for (const module of block.modules) {
      if ((module.lessons ?? module.items ?? []).some((item) => item.id === lessonId)) {
        keys.push(`block:${block.id}`, `module:${module.id}`, `lesson:${lessonId}`);
        return keys;
      }
    }
  }
  for (const module of tree.unassignedModules) {
    if ((module.lessons ?? module.items ?? []).some((item) => item.id === lessonId)) {
      keys.push(`module:${module.id}`, `lesson:${lessonId}`);
      return keys;
    }
  }
  return keys;
}

export function firstReviewableLessonId(tree: RetrainingLearningTreeModel) {
  const lessons = flattenTreeLessons(tree);
  const current = lessons.find((item) => item.is_current);
  if (current && canReviewLesson(current)) return current.id;
  const completed = lessons.find((item) => treeLessonStatus(item) === "completed");
  if (completed) return completed.id;
  return lessons.find((item) => canReviewLesson(item))?.id ?? null;
}

export function currentLessonSeedKeys(tree: RetrainingLearningTreeModel, currentLessonId?: number | null) {
  const listed = flattenTreeLessons(tree).find((item) => item.id === currentLessonId);
  if (listed && canReviewLesson(listed)) return keysForLesson(tree, listed.id);
  return keysForLesson(tree, firstReviewableLessonId(tree));
}
