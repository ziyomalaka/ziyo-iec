"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  FlaskConical,
  Lock,
  NotebookPen,
  Presentation,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import LessonFileViewer from "@/components/dashboard/learning/LessonFileViewer";
import LessonVideoPlayer from "@/components/dashboard/learning/LessonVideoPlayer";
import { pickFileUrl, resolveMediaUrl } from "@/lib/api/media";
import type { LearningCourseResponse, LearningLessonDetail, LearningLessonSummary, LearningModule } from "@/lib/api/types/learning";
import { cn } from "@/lib/cn";
import type { LessonUiState } from "@/lib/learning/lesson-progress";
import {
  blockProgress,
  buildRetrainingLearningTree,
  canExpandLesson,
  currentLessonSeedKeys,
  displayBlockLabel,
  displayLessonTitle,
  displayModuleTitle,
  lessonStatusCaption,
  listTreeLessonMaterials,
  moduleProgress,
  treeLessonStatus,
  type LearningTreeBlock,
  type TreeLessonMaterial,
} from "@/lib/retraining/learning-tree";
import type { RetrainingMaterialType } from "@/lib/retraining/material-types";

const accordionMemory = new Map<number, Set<string>>();

const MATERIAL_ICON: Record<RetrainingMaterialType, LucideIcon> = {
  VIDEO: Video,
  LECTURE: FileText,
  PRESENTATION: Presentation,
  GUIDE: BookOpen,
  SEMINAR: NotebookPen,
  LABORATORY: FlaskConical,
  MUSTAQIL_ISH: ClipboardList,
  TEST: FileText,
};

const DEPTH_MIN = [0, 10, 20, 28, 36];
const DEPTH_MAX = [0, 20, 40, 60, 80];

function Depth({ depth, children }: { depth: 0 | 1 | 2 | 3 | 4; children: ReactNode }) {
  return (
    <div
      className="min-w-0"
      style={{ paddingLeft: `clamp(${DEPTH_MIN[depth]}px, ${depth * 4.5}vw, ${DEPTH_MAX[depth]}px)` }}
    >
      {children}
    </div>
  );
}

function moduleLessons(module: LearningModule) {
  return module.lessons ?? module.items ?? [];
}

function StatusMark({ status }: { status: LessonUiState }) {
  if (status === "completed") {
    return <Check className="h-4 w-4 shrink-0 text-[#16A34A]" aria-hidden />;
  }
  if (status === "current") {
    return <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden />;
  }
  if (status === "locked") {
    return <Lock className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />;
  }
  return <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border border-[#94A3B8]" aria-hidden />;
}

function ToggleIcon({ open }: { open: boolean }) {
  const Icon = open ? ChevronDown : ChevronRight;
  return <Icon className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden />;
}

function seedKeys(tree: ReturnType<typeof buildRetrainingLearningTree>, lessonId?: number | null) {
  const keys = new Set(currentLessonSeedKeys(tree, lessonId));
  if (tree.blocks[0]) keys.add(`block:${tree.blocks[0].id}`);
  return keys;
}

export default function RetrainingLearningTree({
  course,
  lessonDetails,
  selectedLessonId,
  activeMaterialKey,
  canLearn,
  lessonLoadingId,
  completing,
  testError,
  testSlot,
  banner,
  onToggleLesson,
  onOpenMaterial,
  onMaterialViewed,
}: {
  course: LearningCourseResponse;
  lessonDetails: Record<number, LearningLessonDetail>;
  selectedLessonId: number | null;
  activeMaterialKey: string | null;
  canLearn: boolean;
  lessonLoadingId: number | null;
  completing?: boolean;
  testError?: ReactNode;
  testSlot?: ReactNode;
  banner?: ReactNode;
  onToggleLesson: (lesson: LearningLessonSummary, open: boolean) => void;
  onOpenMaterial: (lessonId: number, material: TreeLessonMaterial) => void;
  onMaterialViewed: (lessonId: number, material: TreeLessonMaterial) => void;
}) {
  const tree = useMemo(() => buildRetrainingLearningTree(course), [course]);
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const remembered = accordionMemory.get(tree.directionId);
    if (remembered) return new Set(remembered);
    return seedKeys(tree, course.current_lesson_id);
  });
  const seededCourse = useRef(tree.directionId);

  useEffect(() => {
    accordionMemory.set(tree.directionId, openKeys);
  }, [openKeys, tree.directionId]);

  useEffect(() => {
    if (seededCourse.current === tree.directionId) return;
    seededCourse.current = tree.directionId;
    const remembered = accordionMemory.get(tree.directionId);
    setOpenKeys(remembered ?? seedKeys(tree, selectedLessonId ?? course.current_lesson_id));
  }, [course.current_lesson_id, selectedLessonId, tree]);

  const lastExpanded = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedLessonId || lastExpanded.current === selectedLessonId) return;
    lastExpanded.current = selectedLessonId;
    const extra = currentLessonSeedKeys(tree, selectedLessonId);
    setOpenKeys((prev) => {
      const next = new Set(prev);
      for (const key of extra) next.add(key);
      return next;
    });
  }, [selectedLessonId, tree]);

  const isOpen = (key: string) => openKeys.has(key);
  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const directionKey = `direction:${tree.directionId}`;
  const directionOpen = isOpen(directionKey);

  const renderModules = (modules: LearningModule[], depth: 1 | 2 = 2) =>
    modules.map((module, moduleIndex) => {
      const moduleKey = `module:${module.id}`;
      const open = isOpen(moduleKey);
      const progress = moduleProgress(module);
      return (
        <div key={module.id} className="min-w-0">
          <Depth depth={depth}>
            <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
              <button
                type="button"
                onClick={() => toggle(moduleKey)}
                aria-expanded={open}
                className="flex min-h-11 w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-[#F8FAFC]"
              >
                <ToggleIcon open={open} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-[#64748B]">Modul</span>
                  <span className="mt-0.5 block break-words text-sm font-semibold text-[#0C2340]">
                    {displayModuleTitle(module, moduleIndex)}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#64748B]">
                    {progress.done} / {progress.total} dars
                  </span>
                </span>
              </button>
            </div>
          </Depth>
          {open
            ? moduleLessons(module).map((lesson, lessonIndex) => {
                const lessonOpen = isOpen(`lesson:${lesson.id}`);
                return (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    lessonIndex={lessonIndex}
                    moduleIndex={moduleIndex}
                    open={lessonOpen}
                    selected={selectedLessonId === lesson.id}
                    canLearn={canLearn}
                    loading={lessonLoadingId === lesson.id}
                    completing={completing && selectedLessonId === lesson.id}
                    detail={lessonDetails[lesson.id]}
                    activeMaterialKey={selectedLessonId === lesson.id ? activeMaterialKey : null}
                    testError={selectedLessonId === lesson.id ? testError : null}
                    testSlot={selectedLessonId === lesson.id ? testSlot : null}
                    onToggle={() => {
                      const nextOpen = !lessonOpen;
                      toggle(`lesson:${lesson.id}`);
                      onToggleLesson(lesson, nextOpen);
                    }}
                    onOpenMaterial={onOpenMaterial}
                    onMaterialViewed={onMaterialViewed}
                  />
                );
              })
            : null}
        </div>
      );
    });

  const renderBlock = (block: LearningTreeBlock, index: number) => {
    const key = `block:${block.id}`;
    const open = isOpen(key);
    const progress = blockProgress(block);
    return (
      <div key={block.id} className="min-w-0 space-y-1.5">
        <Depth depth={1}>
          <div className="overflow-hidden rounded-xl border border-[#E8EDF5] border-l-[3px] border-l-[#2563EB]/50 bg-[#F8FAFC]">
            <button
              type="button"
              onClick={() => toggle(key)}
              aria-expanded={open}
              className="flex min-h-11 w-full items-start gap-2 px-3 py-3 text-left hover:bg-white/80"
            >
              <ToggleIcon open={open} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">Blok</span>
                  <span className="mt-0.5 block break-words text-sm font-bold text-[#0C2340]">
                    {displayBlockLabel(block, index)}
                  </span>
                  <span className="mt-0.5 block text-xs text-[#64748B]">
                    {progress.done} / {progress.total} modul
                  </span>
                </span>
            </button>
          </div>
        </Depth>
        {open ? (
          <div className="space-y-1.5">
            {block.modules.length ? renderModules(block.modules) : (
              <Depth depth={2}>
                <p className="px-3 py-2 text-xs text-[#64748B]">Bu blokda modul yo&apos;q.</p>
              </Depth>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4">
      {banner}
      <section className="overflow-hidden rounded-2xl border border-[#E8EDF5] bg-white shadow-[0_8px_24px_rgba(15,35,64,0.05)]">
        <button
          type="button"
          onClick={() => toggle(directionKey)}
          aria-expanded={directionOpen}
          className="flex min-h-12 w-full items-start gap-3 px-4 py-4 text-left sm:px-5"
        >
          <ToggleIcon open={directionOpen} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-bold uppercase tracking-wide text-[#2563EB]">Yo&apos;nalish</span>
            <span className="mt-1 block break-words text-base font-bold text-[#0C2340] sm:text-lg">
              {tree.directionTitle || "Yo'nalish"}
            </span>
            <span className="mt-2 inline-flex items-center gap-2 text-xs text-[#64748B]">
              <span className="h-1 w-16 overflow-hidden rounded-full bg-[#EEF2F7] sm:w-24">
                <span
                  className="block h-full rounded-full bg-[#2563EB]"
                  style={{ width: `${Math.min(100, tree.progressPercent)}%` }}
                />
              </span>
              <span>Jarayon: {tree.progressPercent}%</span>
            </span>
          </span>
        </button>
        {directionOpen ? (
          <div className="space-y-2 border-t border-[#EEF2F7] bg-[#FCFDFE] px-3 py-3 sm:px-4">
            {tree.blocks.map((block, index) => renderBlock(block, index))}
            {!tree.blocks.length ? (
              <p className="px-3 py-6 text-sm text-[#64748B]">Modullar hali yuklanmagan.</p>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function LessonRow({
  lesson,
  lessonIndex,
  moduleIndex,
  open,
  selected,
  canLearn,
  loading,
  completing,
  detail,
  activeMaterialKey,
  testError,
  testSlot,
  onToggle,
  onOpenMaterial,
  onMaterialViewed,
}: {
  lesson: LearningLessonSummary;
  lessonIndex: number;
  moduleIndex: number;
  open: boolean;
  selected: boolean;
  canLearn: boolean;
  loading: boolean;
  completing?: boolean;
  detail?: LearningLessonDetail;
  activeMaterialKey: string | null;
  testError?: ReactNode;
  testSlot?: ReactNode;
  onToggle: () => void;
  onOpenMaterial: (lessonId: number, material: TreeLessonMaterial) => void;
  onMaterialViewed: (lessonId: number, material: TreeLessonMaterial) => void;
}) {
  const status = treeLessonStatus(lesson);
  const locked = !canLearn || (!canExpandLesson(lesson) && status !== "completed");
  const materials = listTreeLessonMaterials(
    detail ?? {
      id: lesson.id,
      title: lesson.title,
      materials: lesson.materials ?? [],
    }
  );

  return (
    <div className="min-w-0">
      <Depth depth={3}>
        <button
          type="button"
          disabled={locked}
          onClick={onToggle}
          aria-expanded={locked ? undefined : open}
          className={cn(
            "flex min-h-11 w-full items-start gap-2 rounded-xl px-3 py-2 text-left",
            locked && "cursor-not-allowed bg-[#F8FAFC] text-[#94A3B8]",
            !locked && status === "current" && "bg-[#EEF4FF]",
            !locked && status === "completed" && selected && "bg-[#F0FDF4]",
            !locked && selected && status !== "current" && status !== "completed" && "bg-[#F8FAFC]",
            !locked && !selected && "hover:bg-[#F8FAFC]"
          )}
        >
          {locked ? <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#94A3B8]" /> : <ToggleIcon open={open} />}
          <StatusMark status={status} />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block break-words text-sm font-medium",
                locked ? "text-[#94A3B8]" : status === "current" ? "text-[#2563EB]" : "text-[#0C2340]"
              )}
            >
              {displayLessonTitle(lesson, lessonIndex, moduleIndex)}
            </span>
            <span className="mt-0.5 block text-xs text-[#64748B]">
              {status === "completed" ? "✓ Tugallangan" : lessonStatusCaption(status)}
            </span>
          </span>
        </button>
      </Depth>
      {open && !locked ? (
        <Depth depth={4}>
          <div className="space-y-2 pb-3 pt-1">
            {loading && !materials.length ? (
              <p className="px-2 py-2 text-xs text-[#64748B]">Materiallar yuklanmoqda...</p>
            ) : null}
            {materials.map((material) => {
              const Icon = MATERIAL_ICON[material.type] ?? FileText;
              const active = activeMaterialKey === material.key;
              return (
                <div key={material.key} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onOpenMaterial(lesson.id, material)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left",
                      active ? "border-[#2563EB] bg-[#EEF4FF]" : "border-[#E8EDF5] bg-white hover:bg-[#F8FAFC]"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-[#0C2340]">
                      {material.title}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[#2563EB]" />
                  </button>
                  {active ? (
                    <MaterialBody
                      material={material}
                      onViewed={() => onMaterialViewed(lesson.id, material)}
                    />
                  ) : null}
                </div>
              );
            })}
            {!loading && detail && materials.length === 0 ? (
              <p className="px-2 py-2 text-xs text-[#64748B]">Bu darsda material yo&apos;q.</p>
            ) : null}
            {testError}
            {testSlot}
            {completing ? <p className="px-2 text-xs text-[#64748B]">Dars yakunlanmoqda...</p> : null}
          </div>
        </Depth>
      ) : null}
    </div>
  );
}

function MaterialBody({
  material,
  onViewed,
}: {
  material: TreeLessonMaterial;
  onViewed: () => void;
}) {
  const viewed = useRef(false);
  const href = resolveMediaUrl(material.href || pickFileUrl({ file_url: material.href }) || "");

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    onViewed();
  }, [material.key, onViewed]);

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-[#E8EDF5] bg-white p-3">
      {material.type === "VIDEO" && href ? (
        <LessonVideoPlayer src={href} onEnded={onViewed} />
      ) : null}
      {material.contentText?.trim() ? (
        <article className="whitespace-pre-wrap text-sm leading-6 text-[#0C2340]">{material.contentText}</article>
      ) : null}
      {href && material.type !== "VIDEO" ? (
        <LessonFileViewer
          src={href}
          title={material.title}
          mimeType={material.mimeType}
          fileName={material.originalName}
        />
      ) : null}
      {!href && !material.contentText?.trim() ? (
        <p className="text-sm text-[#64748B]">Kontent ochilmadi.</p>
      ) : null}
    </div>
  );
}
