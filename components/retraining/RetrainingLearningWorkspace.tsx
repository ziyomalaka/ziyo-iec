"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Clock, Lock, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import {
  fetchMyTestResults,
  readLessonTestAttempt,
  readMaterialProgress,
  writeMaterialProgress,
} from "@/lib/api/learning-progress";
import { isAttemptsExhausted } from "@/lib/api/learning-test";
import type {
  LearningCourseResponse,
  LearningLessonDetail,
  LearningLessonSummary,
  LearningModule,
} from "@/lib/api/types/learning";
import LessonMaterialsFlow from "@/components/dashboard/learning/LessonMaterialsFlow";
import LessonTest from "@/components/dashboard/learning/LessonTest";
import { LessonSkeleton } from "@/components/dashboard/learning/LearningSkeletons";
import { cn } from "@/lib/cn";
import {
  allRequiredCompleted,
  listRequiredMaterials,
  MAX_LESSON_TEST_ATTEMPTS,
  type RequiredLessonMaterial,
} from "@/lib/learning/required-materials";
import { canOpenLesson, displayLessonLabel, resolveLessonProgressStatus } from "@/lib/learning/lesson-progress";
import {
  buildRetrainingLearningTree,
  canReviewLesson,
  displayBlockLabel,
  displayModuleTitle,
  findLessonTrail,
  flattenTreeLessons,
  listTreeLessonMaterials,
  moduleProgress,
  treeLessonStatus,
  type LearningTreeBlock,
} from "@/lib/retraining/learning-tree";
import { RETRAINING_UNLOCK_LOCKED_MESSAGE } from "@/lib/retraining/lesson-unlock";
import { retrainingMaterialLabel, type RetrainingMaterialType } from "@/lib/retraining/material-types";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

const completeAttempted = new Set<number>();

function moduleLessons(module: LearningModule): LearningLessonSummary[] {
  return module.lessons ?? module.items ?? [];
}

function kindFromType(type: RetrainingMaterialType): RequiredLessonMaterial["kind"] {
  if (type === "VIDEO") return "video";
  if (type === "PRESENTATION") return "presentation";
  if (type === "SEMINAR") return "seminar";
  if (type === "LABORATORY") return "laboratory";
  return "lecture";
}

function requiredFromLesson(lesson: LearningLessonDetail): RequiredLessonMaterial[] {
  const fromTree = listTreeLessonMaterials(lesson).map((item) => ({
    key: item.key,
    kind: kindFromType(item.type),
    label: retrainingMaterialLabel(item.type),
    title: item.title,
    materialId: item.materialId,
  }));
  return fromTree.length ? fromTree : listRequiredMaterials(lesson);
}

function formatDuration(lesson: LearningLessonDetail) {
  const label = lesson.duration_label?.trim();
  if (label) return label;
  const mins = lesson.duration_minutes;
  if (!mins || mins <= 0) return null;
  if (mins % 60 === 0) return `${mins / 60} soat`;
  if (mins > 60) return `${Math.floor(mins / 60)} soat ${mins % 60} daqiqa`;
  return `${mins} daqiqa`;
}

function lessonTypeBadge(type?: string | null) {
  const raw = String(type ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper === "PRACTICAL" || upper.includes("AMALIY")) {
    return { label: "Amaliy dars", className: "bg-[#FFF4E5] text-[#B45309]" };
  }
  return { label: "Nazariy dars", className: "bg-[#EAF3FF] text-[#1D4ED8]" };
}

function CircularProgress({ percent }: { percent: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <div className="relative h-14 w-14 shrink-0" aria-label={`${clamped}%`}>
      <svg viewBox="0 0 44 44" className="-rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#E8EDF5" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="#2563EB"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#0C2340]">
        {clamped}%
      </span>
    </div>
  );
}

function LessonStatusMark({
  status,
}: {
  status: ReturnType<typeof treeLessonStatus>;
}) {
  if (status === "completed") {
    return <Check className="h-4 w-4 shrink-0 text-[#16A34A]" strokeWidth={2.6} aria-hidden />;
  }
  if (status === "current") {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#2563EB]" aria-hidden />;
  }
  if (status === "locked") {
    return <Lock className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />;
  }
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#94A3B8]" aria-hidden />;
}

export type RetrainingLearningWorkspaceProps = {
  course: LearningCourseResponse;
  lesson: LearningLessonDetail | null;
  selectedId: number | null;
  canLearn: boolean;
  lessonLoading?: boolean;
  completing?: boolean;
  banner?: ReactNode;
  empty?: ReactNode;
  courseHref: string;
  pane?: "outline" | "lesson";
  onOpenLesson: (id: number) => void;
  onComplete?: (opts?: { goNext?: boolean }) => void;
  onTestPassed?: () => void;
  unlockCountdown?: string | null;
};

export default function RetrainingLearningWorkspace({
  course,
  lesson,
  selectedId,
  canLearn,
  lessonLoading,
  completing,
  banner,
  empty,
  courseHref,
  pane = "outline",
  onOpenLesson,
  onComplete,
  onTestPassed,
  unlockCountdown,
}: RetrainingLearningWorkspaceProps) {
  const paths = useStudentProgramPaths();
  const tree = useMemo(() => buildRetrainingLearningTree(course), [course]);
  const allLessons = useMemo(() => flattenTreeLessons(tree), [tree]);
  const [directionOpen, setDirectionOpen] = useState(true);
  const [openBlocks, setOpenBlocks] = useState<number[]>([]);
  const [openModules, setOpenModules] = useState<number[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [testFlowDone, setTestFlowDone] = useState(false);
  const [hasLiveTest, setHasLiveTest] = useState<boolean | null>(null);
  const [materialsFlowFinished, setMaterialsFlowFinished] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const blocksInit = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const required = useMemo(() => (lesson ? requiredFromLesson(lesson) : []), [lesson]);
  const materialsDone = allRequiredCompleted(required, completedKeys);
  const hasTest = hasLiveTest === true;

  useEffect(() => {
    const trail = findLessonTrail(tree, selectedId);
    const blockId = trail?.block.id ?? tree.blocks[0]?.id;
    const moduleId = trail?.module.id ?? tree.blocks[0]?.modules[0]?.id;
    if (!blocksInit.current) {
      blocksInit.current = true;
      if (blockId) setOpenBlocks([blockId]);
      if (moduleId) setOpenModules([moduleId]);
      return;
    }
    if (blockId) {
      setOpenBlocks((prev) => (prev.includes(blockId) ? prev : [...prev, blockId]));
    }
    if (moduleId) {
      setOpenModules((prev) => (prev.includes(moduleId) ? prev : [...prev, moduleId]));
    }
  }, [selectedId, tree]);

  useEffect(() => {
    setHasLiveTest(null);
    setTestFlowDone(false);
    setMaterialsFlowFinished(false);
    setMoreOpen(false);
    if (!lesson?.id) setCompletedKeys(new Set());
  }, [lesson?.id]);

  useEffect(() => {
    if (!lesson?.id) return;
    const saved = readLessonTestAttempt(lesson.id);
    const localTestDone = Boolean(
      saved?.result && (saved.result.passed || isAttemptsExhausted(saved.result, MAX_LESSON_TEST_ATTEMPTS))
    );
    setTestFlowDone(localTestDone);

    void (async () => {
      try {
        const remote = await fetchMyTestResults();
        const remoteDone = remote.items.some(
          (row) =>
            row.lessonId === lesson.id &&
            (row.passed === true ||
              row.mastery_status === "completed" ||
              row.mastery_status === "not_mastered" ||
              (row.attempt ?? 0) >= MAX_LESSON_TEST_ATTEMPTS)
        );
        if (remoteDone) setTestFlowDone(true);
      } catch {
        /* local fallback */
      }
    })();

    const materials = lesson.materials ?? [];
    const apiHasProgress = materials.some((m) => m.is_completed !== undefined || m.completed !== undefined);
    const fromApi = materials
      .filter((m) => m.id && (m.is_completed === true || m.completed === true))
      .map((m) => `material:${m.id}`);
    let keys: Set<string>;
    if (apiHasProgress) {
      keys = new Set(fromApi);
      setCompletedKeys(keys);
      writeMaterialProgress(lesson.id, fromApi);
    } else {
      keys = new Set(readMaterialProgress(lesson.id));
      setCompletedKeys(keys);
    }
    const requiredNow = requiredFromLesson(lesson);
    setMaterialsFlowFinished(
      (prev) => prev || requiredNow.length === 0 || allRequiredCompleted(requiredNow, keys)
    );
  }, [lesson?.id, lesson?.materials]);

  const markComplete = async (opts: { key: string; materialId?: number }) => {
    if (!lesson) return;
    setCompletedKeys((prev) => {
      const next = new Set(prev);
      next.add(opts.key);
      writeMaterialProgress(lesson.id, [...next]);
      return next;
    });
  };

  const navIndex = allLessons.findIndex((item) => item.id === lesson?.id);
  const prevLesson = navIndex > 0 ? allLessons[navIndex - 1] : null;
  const nextLesson = navIndex >= 0 ? allLessons[navIndex + 1] ?? null : null;
  const prevId = prevLesson?.id ?? null;
  const nextId = nextLesson?.id ?? null;
  const nextLocked = nextLesson ? treeLessonStatus(nextLesson) === "locked" || !canReviewLesson(nextLesson) : false;
  const completed = Boolean(
    lesson &&
      (lesson.is_completed === true ||
        lesson.completed === true ||
        String(lesson.status ?? "").toLowerCase() === "completed")
  );
  const trail = lesson ? findLessonTrail(tree, lesson.id) : selectedId ? findLessonTrail(tree, selectedId) : null;
  const lessonCode = trail
    ? displayLessonLabel(trail.module, trail.lesson, trail.lessonIndex, trail.moduleIndex)
    : "Dars";
  const canManualComplete = hasLiveTest === false && materialsDone && !completed;
  const lessonReadyForNext = completed;

  useEffect(() => {
    if (!lesson) return;
    if (completed || completing) return;
    if (!materialsDone || hasLiveTest !== false) return;
    if (required.length > 0 && !materialsFlowFinished) return;
    if (completeAttempted.has(lesson.id)) return;
    completeAttempted.add(lesson.id);
    onCompleteRef.current?.({ goNext: true });
  }, [lesson, completed, completing, materialsDone, materialsFlowFinished, hasLiveTest, required.length]);

  const progressPercent = tree.progressPercent;
  const moduleDone = trail ? moduleProgress(trail.module) : null;
  const modulePercent =
    moduleDone && moduleDone.total > 0 ? Math.round((moduleDone.done / moduleDone.total) * 100) : null;
  const duration = lesson ? formatDuration(lesson) : null;
  const typeBadge = lessonTypeBadge(lesson?.lesson_type);
  const description = (lesson?.description || lesson?.about || "").trim();
  const nextDisabled = !nextId || !lessonReadyForNext || nextLocked;

  const notifyLocked = () => {
    toast.error(
      unlockCountdown
        ? `${RETRAINING_UNLOCK_LOCKED_MESSAGE} ${unlockCountdown}`
        : RETRAINING_UNLOCK_LOCKED_MESSAGE
    );
  };

  const toggleBlock = (id: number) => {
    setOpenBlocks((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };
  const toggleModule = (id: number) => {
    setOpenModules((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const renderLessons = (module: LearningModule, moduleIndex: number) => {
    const lessons = moduleLessons(module);
    if (!lessons.length) {
      return <p className="mt-1 px-2 text-xs text-[#94A3B8]">Hozircha kontent qo&apos;shilmagan</p>;
    }
    return (
      <ul className="mt-1 space-y-0.5">
        {lessons.map((item, index) => {
          const status = treeLessonStatus(item);
          const timeLocked = !canReviewLesson(item);
          const selected = selectedId === item.id;
          const current = status === "current" || (selected && status !== "locked" && status !== "completed");
          const code = displayLessonLabel(module, item, index, moduleIndex);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  if (timeLocked) {
                    notifyLocked();
                    return;
                  }
                  onOpenLesson(item.id);
                }}
                className={cn(
                  "flex min-h-12 w-full items-start gap-2 rounded-xl px-2 py-2 text-left",
                  current && "bg-[#EAF3FF]",
                  selected && status === "completed" && "bg-[#F0FDF4]",
                  timeLocked && "text-[#94A3B8]"
                )}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                  <LessonStatusMark
                    status={
                      timeLocked ? "locked" : status === "completed" ? "completed" : current ? "current" : status
                    }
                  />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block break-words text-sm font-medium leading-snug",
                      timeLocked ? "text-[#94A3B8]" : current ? "text-[#1D4ED8]" : "text-[#0C2340]"
                    )}
                  >
                    {code}
                    {item.title?.trim() && !/^dars\s*\d/i.test(item.title.trim()) ? ` · ${item.title.trim()}` : ""}
                  </span>
                  {timeLocked && unlockCountdown ? (
                    <span className="mt-0.5 block text-[12px] leading-tight text-[#64748B]">
                      {unlockCountdown} dan keyin ochiladi
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderModule = (block: LearningTreeBlock, module: LearningModule, moduleIndex: number, indent: string) => {
    const moduleId = module.id || moduleIndex + 1;
    const open = openModules.includes(moduleId);
    const lessons = moduleLessons(module);
    const active = lessons.some((item) => item.id === selectedId);
    return (
      <div key={moduleId} className={indent}>
        <button
          type="button"
          onClick={() => toggleModule(moduleId)}
          aria-expanded={open}
          className={cn(
            "flex min-h-11 w-full items-start gap-2 rounded-xl px-2 py-2 text-left",
            active && "bg-[#F8FBFF]"
          )}
        >
          {open ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-semibold leading-snug text-[#0C2340]">
              {displayModuleTitle(module, moduleIndex)}
            </span>
            <span className="mt-0.5 block text-xs text-[#64748B]">
              {lessons.length} ta dars
            </span>
          </span>
        </button>
        {open ? renderLessons(module, moduleIndex) : null}
      </div>
    );
  };

  const outline = (
    <aside className="min-w-0">
      <div className="rounded-2xl border border-[#E8EDF5] bg-white p-4">
        <h2 className="break-words text-[22px] font-bold leading-tight text-[#0C2340] sm:text-2xl">
          Mening o&apos;quv jarayonim
        </h2>
        <p className="mt-2 text-sm text-[#64748B]">Jarayon: {progressPercent}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
          <div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${Math.min(100, progressPercent)}%` }} />
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-2xl border border-[#E8EDF5] bg-white">
        <button
          type="button"
          onClick={() => setDirectionOpen((open) => !open)}
          aria-expanded={directionOpen}
          className="flex min-h-11 w-full items-start gap-2 px-3 py-3 text-left"
        >
          {directionOpen ? (
            <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
          ) : (
            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block break-words text-sm font-bold leading-snug text-[#0C2340] sm:text-base">
              {tree.directionTitle || "Yo'nalish"}
            </span>
            <span className="mt-0.5 block text-xs text-[#64748B]">Qayta tayyorlash</span>
          </span>
        </button>

        {directionOpen ? (
          <div className="space-y-1 border-t border-[#EEF2F7] px-1.5 py-2 sm:px-2">
            {tree.blocks.map((block, blockIndex) => {
              const expanded = openBlocks.includes(block.id);
              return (
                <div key={block.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleBlock(block.id)}
                    aria-expanded={expanded}
                    className="flex min-h-11 w-full items-start gap-2 rounded-xl px-2 py-2 text-left pl-2 sm:pl-3"
                  >
                    {expanded ? (
                      <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
                    ) : (
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#2563EB]" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-semibold leading-snug text-[#0C2340]">
                        {displayBlockLabel(block, blockIndex)}
                      </span>
                      <span className="mt-0.5 block text-xs text-[#64748B]">
                        {block.modules.length} modul
                      </span>
                    </span>
                  </button>
                  {expanded
                    ? block.modules.length
                      ? block.modules.map((module, moduleIndex) =>
                          renderModule(block, module, moduleIndex, "pl-4 sm:pl-6")
                        )
                      : (
                          <p className="px-6 py-1 text-xs text-[#94A3B8]">Hozircha kontent qo&apos;shilmagan</p>
                        )
                    : null}
                </div>
              );
            })}
            {!tree.blocks.length ? (
              <p className="px-3 py-4 text-sm text-[#64748B]">Hozircha kontent qo&apos;shilmagan</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );

  const crumbs = trail
    ? [
        { href: paths.home, label: "Qayta tayyorlash" },
        { href: courseHref, label: tree.directionTitle || "Yo'nalish" },
        { label: displayBlockLabel(trail.block, trail.blockIndex) },
        { label: displayModuleTitle(trail.module, trail.moduleIndex) },
        { label: lessonCode },
      ]
    : [{ href: paths.home, label: "Qayta tayyorlash" }, { href: courseHref, label: tree.directionTitle || "Yo'nalish" }];

  const lessonPane = (
    <div className="min-w-0 space-y-4">
      {!canLearn ? empty : null}
      {canLearn && lessonLoading && !lesson ? <LessonSkeleton /> : null}
      {canLearn && lesson ? (
        <div className="rounded-2xl border border-[#E8EDF5] bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-center gap-2 lg:hidden">
            <Link
              href={courseHref}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[#2563EB]"
              aria-label="O'quv jarayoniga qaytish"
            >
              ←
            </Link>
            <p className="min-w-0 flex-1 truncate text-center text-base font-semibold text-[#0C2340]">{lessonCode}</p>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[#64748B]"
                aria-label="Qo'shimcha"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              {moreOpen ? (
                <div className="absolute top-full right-0 z-10 mt-1 w-44 overflow-hidden rounded-xl border border-[#E8EDF5] bg-white py-1 shadow-lg">
                  <Link
                    href={courseHref}
                    className="flex min-h-11 items-center px-3 text-sm text-[#0C2340]"
                    onClick={() => setMoreOpen(false)}
                  >
                    Darslar ro&apos;yxati
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <nav className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] text-[#64748B] sm:text-[13px] lg:flex-nowrap">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
                {index > 0 ? <span className="shrink-0 text-[#94A3B8]">&gt;</span> : null}
                {crumb.href ? (
                  <Link href={crumb.href} className="min-w-0 break-words text-[#2563EB] hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="min-w-0 break-words font-medium text-[#0C2340]">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {trail ? (
            <div className="mt-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-words text-lg font-bold leading-snug text-[#0C2340] sm:text-xl">
                  {displayModuleTitle(trail.module, trail.moduleIndex)}
                </h2>
                {trail.module.description?.trim() ? (
                  <p className="mt-1 break-words text-sm leading-relaxed text-[#64748B]">
                    {trail.module.description.trim()}
                  </p>
                ) : null}
              </div>
              {modulePercent != null ? (
                <div className="shrink-0 text-center">
                  <CircularProgress percent={modulePercent} />
                  {moduleDone ? (
                    <p className="mt-1 text-[11px] font-medium text-[#64748B]">
                      {moduleDone.done} / {moduleDone.total} dars
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-4 border-t border-[#E8EDF5] pt-4">
            <div className="flex flex-wrap items-center gap-2">
              {typeBadge ? (
                <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", typeBadge.className)}>
                  {typeBadge.label}
                </span>
              ) : null}
              {duration ? (
                <span className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 text-[12px] font-medium text-[#475569]">
                  <Clock className="h-3.5 w-3.5" />
                  {duration}
                </span>
              ) : null}
            </div>
            <h1 className="mt-2 break-words text-[22px] font-bold leading-tight text-[#0C2340] sm:text-[26px]">
              {lessonCode}
            </h1>
            <p className="mt-1 break-words text-[17px] font-semibold leading-snug text-[#0C2340] sm:text-xl">
              {lesson.title}
            </p>
            {description ? (
              <p className="mt-2 break-words text-sm leading-relaxed text-[#64748B] sm:text-base">{description}</p>
            ) : null}
          </div>

          <LessonMaterialsFlow
            key={lesson.id}
            lesson={lesson}
            lessonCode={lessonCode}
            items={required}
            variant="retraining"
            completedKeys={completedKeys}
            onMarkComplete={(opts) => void markComplete(opts)}
            onFlowFinished={() => setMaterialsFlowFinished(true)}
            hasTest={hasTest}
            testDone={testFlowDone}
            testSlot={
              !canOpenLesson(resolveLessonProgressStatus(lesson)) ? null : (
                <LessonTest
                  key={`test-${lesson.id}`}
                  lessonId={lesson.id}
                  materials={[...(lesson.tests ?? []), ...(lesson.materials ?? [])]}
                  materialsUnlocked={materialsDone}
                  courseTitle={tree.directionTitle}
                  moduleTitle={lesson.module_title}
                  lessonTitle={lesson.title}
                  compactCard
                  onResolved={(exists) => setHasLiveTest(exists)}
                  onFinished={() => {
                    setTestFlowDone(true);
                    onTestPassed?.();
                    onComplete?.({ goNext: false });
                  }}
                  onContinue={() => {
                    setTestFlowDone(true);
                    onTestPassed?.();
                    onComplete?.({ goNext: true });
                  }}
                />
              )
            }
          />

          <div className="mt-6 flex flex-col gap-2 border-t border-[#E8EDF5] pt-4 min-[390px]:flex-row min-[390px]:justify-between">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && onOpenLesson(prevId)}
              className="min-h-12 w-full rounded-xl border border-[#E8EDF5] px-4 text-sm font-medium text-[#0C2340] disabled:opacity-40 min-[390px]:w-auto"
            >
              ← Oldingi dars
            </button>
            {canManualComplete && onComplete ? (
              <button
                type="button"
                disabled={completing}
                onClick={() => {
                  if (completing || !lesson) return;
                  completeAttempted.add(lesson.id);
                  onComplete();
                }}
                className="min-h-12 w-full rounded-xl border border-[#2563EB] px-4 text-sm font-medium text-[#2563EB] disabled:opacity-60 min-[390px]:w-auto"
              >
                {completing ? "Saqlanmoqda..." : "Darsni tugatish"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={nextDisabled}
              onClick={() => {
                if (!nextId || nextDisabled) return;
                onOpenLesson(nextId);
              }}
              className="min-h-12 w-full rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white disabled:opacity-40 min-[390px]:w-auto"
            >
              Keyingi dars →
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3 text-sm leading-relaxed text-[#1E3A8A]">
            Darsni to&apos;liq o&apos;zlashtirish uchun barcha materiallar bilan tanishib chiqing.
          </div>
        </div>
      ) : canLearn && !lessonLoading && pane === "lesson" ? (
        <p className="text-[#64748B]">
          {allLessons.length ? "Chap tomondan darsni tanlang" : "Hozircha kontent qo'shilmagan"}
        </p>
      ) : canLearn && !lessonLoading && !allLessons.length ? (
        <p className="text-[#64748B]">Hozircha kontent qo&apos;shilmagan</p>
      ) : null}
    </div>
  );

  return (
    <div className="min-w-0 overflow-x-hidden space-y-4">
      {banner}
      <div className="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] lg:gap-6">
        <div className={cn(pane === "lesson" ? "hidden lg:block" : "block")}>{outline}</div>
        <div className={cn(pane === "outline" ? "hidden lg:block" : "block")}>
          {pane === "outline" && !lesson && !lessonLoading ? (
            <p className="hidden text-[#64748B] lg:block">
              {allLessons.length ? "Chap tomondan darsni tanlang" : "Hozircha kontent qo'shilmagan"}
            </p>
          ) : (
            lessonPane
          )}
        </div>
      </div>
    </div>
  );
}
