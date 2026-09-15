"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  completeLessonMaterial,
  readMaterialProgress,
  writeMaterialProgress,
  readLessonTestAttempt,
  fetchMyTestResults,
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
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

/** Retraining lesson complete — StrictMode/re-render da ikki marta ketmasin. */
const retrainingLessonCompleteAttempted = new Set<number>();

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
  backHref,
  pane = "outline",
  onOpenLesson,
  onComplete,
  onTestPassed,
}: LearningWorkspaceProps) {
  const paths = useStudentProgramPaths();
  const resolvedBackHref = backHref ?? (paths.kind === "retraining" ? paths.learning : paths.myCourses);
  const backLabel = paths.kind === "retraining" ? "← O'quv jarayoni" : "← Mening yo'nalishim";
  const tree = useMemo(() => ensureLearningTree(course), [course]);
  const allLessons = useMemo(() => flattenLearningLessons(tree.modules ?? []), [tree]);
  const [openModules, setOpenModules] = useState<number[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  const [testFlowDone, setTestFlowDone] = useState(false);
  const [hasLiveTest, setHasLiveTest] = useState<boolean | null>(null);
  const [materialsFlowFinished, setMaterialsFlowFinished] = useState(false);
  const modulesInit = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isRetraining = paths.kind === "retraining";
  const required = useMemo(() => (lesson ? listRequiredMaterials(lesson) : []), [lesson]);
  const materialsDone = allRequiredCompleted(required, completedKeys);
  const flaggedTest = lesson ? lessonHasTest(lesson) : false;
  const hasTest = isRetraining ? hasLiveTest === true : (hasLiveTest ?? flaggedTest);

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
    setHasLiveTest(null);
    setTestFlowDone(false);
    setMaterialsFlowFinished(false);
    if (!lesson?.id) setCompletedKeys(new Set());
  }, [lesson?.id]);

  useEffect(() => {
    if (!lesson?.id) return;
    const saved = readLessonTestAttempt(lesson.id);
    const localTestDone = Boolean(
      saved?.result &&
        (saved.result.passed || isAttemptsExhausted(saved.result, MAX_LESSON_TEST_ATTEMPTS))
    );

    setTestFlowDone(localTestDone);

    void (async () => {
      try {
        const remote = await fetchMyTestResults();
        const remoteDone = remote.items.some(
          (row) =>
            row.lessonId === lesson.id &&
            (
              row.passed === true ||
              row.mastery_status === "completed" ||
              row.mastery_status === "not_mastered" ||
              (row.attempt ?? 0) >= MAX_LESSON_TEST_ATTEMPTS
            )
        );

        if (remoteDone) {
          setTestFlowDone(true);
        }
      } catch {
        // Backend natija endpointi bo'lmasa local fallback ishlaydi.
      }
    })();
    const materials = lesson.materials ?? [];
    const apiHasProgress = materials.some(
      (m) => m.is_completed !== undefined || m.completed !== undefined
    );

    const fromApi = materials
      .filter(
        (m) =>
          m.id &&
          (m.is_completed === true || m.completed === true)
      )
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

    const requiredNow = listRequiredMaterials(lesson);
    setMaterialsFlowFinished(
      (prev) =>
        prev ||
        requiredNow.length === 0 ||
        allRequiredCompleted(requiredNow, keys)
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
    if (isRetraining) return;
    await completeLessonMaterial(lesson.id, opts, paths.learningApi, null);
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

  const canManualComplete = isRetraining
    ? hasLiveTest === false && materialsDone && !completed
    : !hasTest && materialsDone && !completed;
  const lessonReadyForNext = isRetraining
    ? completed
    : completed || testFlowDone || (!hasTest && materialsDone);

  useEffect(() => {
    if (!isRetraining || !lesson) return;
    if (completed || completing) return;
    if (!materialsDone || hasLiveTest !== false) return;
    if (required.length > 0 && !materialsFlowFinished) return;
    if (retrainingLessonCompleteAttempted.has(lesson.id)) return;
    retrainingLessonCompleteAttempted.add(lesson.id);
    onCompleteRef.current?.({ goNext: true });
  }, [
    isRetraining,
    lesson,
    completed,
    completing,
    materialsDone,
    materialsFlowFinished,
    hasLiveTest,
    required.length,
  ]);

  const outline = (
    <aside className="min-w-0">
      <Link href={resolvedBackHref} className="mb-3 inline-flex min-h-11 items-center text-sm font-medium text-[#2563EB] lg:hidden">
        {backLabel}
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
                            kind={item.lesson_type}
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
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#2563EB]">{lessonCode}</p>
            {lesson.lesson_type ? (
              <span
                className={cn(
                  "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
                  String(lesson.lesson_type).toUpperCase() === "PRACTICAL"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-sky-50 text-sky-700"
                )}
              >
                {String(lesson.lesson_type).toUpperCase() === "PRACTICAL"
                  ? "Amaliy"
                  : "Nazariy"}
              </span>
            ) : null}
          </div>
          <h1 className="mt-1 break-words text-xl font-bold text-[#0C2340]">{lesson.title}</h1>
          {lesson.module_title ? <p className="mt-1 text-sm text-[#64748B]">{lesson.module_title}</p> : null}

          <LessonMaterialsFlow
            key={lesson.id}
            lesson={lesson}
            lessonCode={lessonCode}
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
              )
            }
          />

          <div className="mt-6 flex flex-col gap-2 border-t border-[#E8EDF5] pt-4 sm:flex-row sm:flex-wrap sm:justify-between">
            <button
              type="button"
              disabled={!prevId}
              onClick={() => prevId && onOpenLesson(prevId)}
              className="min-h-11 w-full rounded-xl border border-[#E8EDF5] px-4 py-2 text-sm font-medium disabled:opacity-40 sm:w-auto"
            >
              Oldingi dars
            </button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {canManualComplete && onComplete ? (
                <button
                  type="button"
                  disabled={completing}
                  onClick={() => {
                    if (completing) return;
                    if (lesson) retrainingLessonCompleteAttempted.add(lesson.id);
                    onComplete();
                  }}
                  className="min-h-11 w-full rounded-xl border border-[#2563EB] px-4 py-2 text-sm font-medium text-[#2563EB] disabled:opacity-60 sm:w-auto"
                >
                  {completing ? "Saqlanmoqda..." : "Darsni tugatish"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={!nextId || (nextStatus === "locked" && !lessonReadyForNext)}
                onClick={() => nextId && onOpenLesson(nextId)}
                className="min-h-11 w-full rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white disabled:opacity-40 sm:w-auto"
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
    <div className="min-w-0 overflow-x-hidden space-y-4">
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

