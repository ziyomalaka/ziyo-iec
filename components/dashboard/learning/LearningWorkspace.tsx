"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  completeLessonMaterial,
  readMaterialProgress,
  writeMaterialProgress,
  readLessonTestAttempt,
} from "@/lib/api/learning-progress";
import type { LearningCourseResponse, LearningLessonDetail, LearningLessonSummary, LearningModule } from "@/lib/api/types/learning";
import LessonMaterialsFlow from "@/components/dashboard/learning/LessonMaterialsFlow";
import LessonTest from "@/components/dashboard/learning/LessonTest";
import LessonNavCard from "@/components/dashboard/learning/LessonNavCard";
import { LessonSkeleton } from "@/components/dashboard/learning/LearningSkeletons";
import {
  canOpenLesson,
  displayLessonLabel,
  displayModuleLabel,
  resolveLessonProgressStatus,
  toLessonUiState,
} from "@/lib/learning/lesson-progress";
import {
  allRequiredCompleted,
  lessonHasTest,
  listRequiredMaterials,
  MAX_LESSON_TEST_ATTEMPTS,
} from "@/lib/learning/required-materials";
import { isAttemptsExhausted } from "@/lib/api/learning-test";
import { ensureLearningTree, flattenLearningLessons } from "@/lib/learning/workspace-tree";
import { cn } from "@/lib/cn";

function moduleLessons(module: LearningModule): LearningLessonSummary[] {
  return module.lessons ?? module.items ?? [];
}

export type LearningWorkspaceProps = {
  course: LearningCourseResponse;
  lesson: LearningLessonDetail | null;
  selectedId: number | null;
  canLearn: boolean;
  lessonLoading?: boolean;
  completing?: boolean;
  banner?: ReactNode;
  empty?: ReactNode;
  courseHref: string;
  backHref?: string;
  /** `outline` — yo'nalish daraxti; `lesson` — dars sahifasi. Desktopda ikkalasi ham. */
  pane?: "outline" | "lesson";
  onOpenLesson: (id: number) => void;
  onComplete?: (opts?: { goNext?: boolean }) => void;
  onTestPassed?: () => void;
};

export default function LearningWorkspace({
  course,
  lesson,
  selectedId,
  canLearn,
  lessonLoading,
  completing,
  banner,
  empty,
  courseHref,
  backHref = "/dashboard/my-courses",
  pane = "outline",
  onOpenLesson,
  onComplete,
  onTestPassed,
}: LearningWorkspaceProps) {
  const tree = useMemo(() => ensureLearningTree(course), [course]);
  const allLessons = useMemo(() => flattenLearningLessons(tree.modules ?? []), [tree]);
  const [openModules, setOpenModules] = useState<number[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [testFlowDone, setTestFlowDone] = useState(false);
  const [hasLiveTest, setHasLiveTest] = useState<boolean | null>(null);
  const modulesInit = useRef(false);

  const required = useMemo(() => (lesson ? listRequiredMaterials(lesson) : []), [lesson]);
  const materialsDone = allRequiredCompleted(required, completedKeys);
  const flaggedTest = lesson ? lessonHasTest(lesson) : false;
  const hasTest = hasLiveTest ?? flaggedTest;

  useEffect(() => {
    const currentModuleId =
      tree.modules?.find((module) =>
        moduleLessons(module).some(
          (item) => item.id === selectedId || toLessonUiState(resolveLessonProgressStatus(item)) === "current"
        )
      )?.id ?? tree.modules?.[0]?.id;
    if (!currentModuleId) return;
    if (!modulesInit.current) {
      modulesInit.current = true;
      setOpenModules([currentModuleId]);
      return;
    }
    setOpenModules((prev) => (prev.includes(currentModuleId) ? prev : [...prev, currentModuleId]));
  }, [selectedId, tree]);

  useEffect(() => {
    if (!lesson?.id) {
      setCompletedKeys(new Set());
      setTestFlowDone(false);
      setHasLiveTest(null);
      return;
    }
    const saved = readLessonTestAttempt(lesson.id);
    const testDone = Boolean(
      saved?.result &&
        (saved.result.passed || isAttemptsExhausted(saved.result, MAX_LESSON_TEST_ATTEMPTS))
    );
    setTestFlowDone(testDone);
    const stored = readMaterialProgress(lesson.id);
    const fromApi = (lesson.materials ?? [])
      .filter((m) => {
        const row = m as { is_completed?: boolean; completed?: boolean };
        return m.id && (row.is_completed === true || row.completed === true);
      })
      .map((m) => `material:${m.id}`);
    setCompletedKeys(new Set([...stored, ...fromApi]));
  }, [lesson?.id, lesson?.materials]);

  const markComplete = async (opts: { key: string; materialId?: number }) => {
    if (!lesson) return;
    setCompletedKeys((prev) => {
      const next = new Set(prev);
      next.add(opts.key);
      writeMaterialProgress(lesson.id, [...next]);
      return next;
    });
    await completeLessonMaterial(lesson.id, opts);
  };

  const prevId =
    lesson?.prev_lesson_id ??
    allLessons[allLessons.findIndex((item) => item.id === lesson?.id) - 1]?.id ??
    null;
  const nextId =
    lesson?.next_lesson_id ??
    allLessons[allLessons.findIndex((item) => item.id === lesson?.id) + 1]?.id ??
    null;
  const nextStatus = nextId
    ? resolveLessonProgressStatus(allLessons.find((item) => item.id === nextId) ?? { status: "locked" })
    : null;
  const completed = Boolean(lesson && toLessonUiState(resolveLessonProgressStatus(lesson)) === "completed");
  const lessonCode = useMemo(() => {
    if (!lesson) return "";
    for (let moduleIndex = 0; moduleIndex < (tree.modules ?? []).length; moduleIndex++) {
      const module = tree.modules![moduleIndex];
      const lessons = moduleLessons(module);
      const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);
      if (lessonIndex >= 0) return displayLessonLabel(module, lessons[lessonIndex], lessonIndex, moduleIndex);
    }
    return "Dars";
  }, [lesson, tree]);

  const canManualComplete = !hasTest && materialsDone && !completed;
  const lessonReadyForNext = completed || testFlowDone || (!hasTest && materialsDone);

  const outline = (
    <aside className="min-w-0">
      <Link href={backHref} className="mb-3 inline-flex min-h-11 items-center text-sm font-medium text-[#2563EB] lg:hidden">
        ← Orqaga
      </Link>
      <h2 className="break-words font-bold text-[#0C2340]">{tree.title || "Kurs tarkibi"}</h2>
      <p className="mt-1 text-sm text-[#64748B]">Jarayon: {tree.progress_percent ?? 0}%</p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
        <div
          className="h-full rounded-full bg-[#0756F5]"
          style={{ width: `${Math.min(100, tree.progress_percent ?? 0)}%` }}
        />
      </div>
      <div className="mt-4 space-y-4">
        {(tree.modules ?? []).map((module, moduleIndex) => {
          const moduleId = module.id || moduleIndex + 1;
          const lessons = moduleLessons(module);
          const expanded = openModules.includes(moduleId);
          const lockedModule = lessons.length > 0 && lessons.every((item) => toLessonUiState(resolveLessonProgressStatus(item)) === "locked");
          return (
            <div key={moduleId} className="rounded-2xl border border-[#E8EDF5] bg-white p-3">
              <button
                type="button"
                onClick={() =>
                  setOpenModules((prev) =>
                    prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
                  )
                }
                className="flex min-h-11 w-full items-start justify-between gap-3 text-left"
                aria-expanded={expanded}
              >
                <span className="min-w-0">
                  <span className="block text-xs font-bold uppercase tracking-wide text-[#2563EB]">
                    {displayModuleLabel(module, moduleIndex)}
                  </span>
                  <span className="mt-0.5 block break-words text-sm font-semibold text-[#0C2340]">{module.title}</span>
                  <span className="mt-1 block text-xs text-[#64748B]">
                    {lessons.length} ta dars
                    {lockedModule ? " · Yopiq" : ""}
                  </span>
                </span>
                <ChevronDown
                  className={`mt-1 h-4 w-4 shrink-0 text-[#2563EB] transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>

              {expanded ? (
                lessons.length ? (
                  <ul className="mt-3 space-y-3">
                    {lessons.map((item, index) => {
                      const progressStatus = resolveLessonProgressStatus(item);
                      const disabled = !canLearn || !canOpenLesson(progressStatus);
                      return (
                        <li key={item.id}>
                          <LessonNavCard
                            code={displayLessonLabel(module, item, index, moduleIndex)}
                            title={item.title}
                            progressStatus={progressStatus}
                            selected={selectedId === item.id}
                            disabled={disabled}
                            onClick={() => onOpenLesson(item.id)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-[#94A3B8]">Modulda darslar hali yuklanmagan.</p>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );

  const lessonPane = (
    <div className="min-w-0 space-y-4">
      {!canLearn ? empty : null}
      {canLearn && lessonLoading && !lesson ? <LessonSkeleton /> : null}
      {canLearn && lesson ? (
        <div className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-sm sm:p-6">
          <Link
            href={courseHref}
            className="mb-3 inline-flex min-h-11 items-center text-sm font-medium text-[#2563EB] lg:hidden"
          >
            ← O&apos;quv jarayoni
          </Link>
          <p className="text-sm font-semibold text-[#2563EB]">{lessonCode}</p>
          <h1 className="mt-1 break-words text-xl font-bold text-[#0C2340]">{lesson.title}</h1>
          {lesson.module_title ? <p className="mt-1 text-sm text-[#64748B]">{lesson.module_title}</p> : null}

          <LessonMaterialsFlow
            key={lesson.id}
            lesson={lesson}
            lessonCode={lessonCode}
            completedKeys={completedKeys}
            onMarkComplete={(opts) => void markComplete(opts)}
            hasTest={hasTest}
            testDone={testFlowDone}
            testSlot={
              <LessonTest
                key={`test-${lesson.id}`}
                lessonId={lesson.id}
                materials={[...(lesson.tests ?? []), ...(lesson.materials ?? [])]}
                materialsUnlocked={materialsDone}
                courseTitle={tree.title}
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
            }
          />

          <div className="mt-6 flex flex-col gap-2 border-t border-[#E8EDF5] pt-4 sm:flex-row sm:flex-wrap sm:justify-between">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && onOpenLesson(prevId)}
              className="min-h-11 w-full rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm font-medium disabled:opacity-40 sm:w-auto"
            >
              Oldingi dars
            </button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {canManualComplete && onComplete ? (
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => onComplete()}
                  className="min-h-11 w-full rounded-lg border border-[#2563EB] px-4 py-2 text-sm font-medium text-[#2563EB] disabled:opacity-60 sm:w-auto"
                >
                  {completing ? "Saqlanmoqda..." : "Darsni tugatish"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!nextId || (nextStatus === "locked" && !lessonReadyForNext)}
                onClick={() => nextId && onOpenLesson(nextId)}
                className="min-h-11 w-full rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white disabled:opacity-40 sm:w-auto"
              >
                Keyingi dars
              </button>
            </div>
          </div>
        </div>
      ) : canLearn && !lessonLoading && pane === "lesson" ? (
        <p className="text-[#64748B]">
          {allLessons.length ? "Dars tanlang." : "Modulda darslar hali yuklanmagan."}
        </p>
      ) : canLearn && !lessonLoading && !allLessons.length ? (
        <p className="text-[#64748B]">Modulda darslar hali yuklanmagan.</p>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-4">
      {banner}
      <div className="flex min-w-0 flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className={cn(pane === "lesson" ? "hidden lg:block" : "block")}>{outline}</div>
        <div className={cn(pane === "outline" ? "hidden lg:block" : "block")}>
          {pane === "outline" && !lesson && !lessonLoading ? (
            <p className="hidden text-[#64748B] lg:block">
              {allLessons.length ? "Dars tanlang." : "Modulda darslar hali yuklanmagan."}
            </p>
          ) : (
            lessonPane
          )}
        </div>
      </div>
    </div>
  );
}

