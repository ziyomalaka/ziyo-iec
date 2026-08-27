"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { lessonVideoUrl } from "@/lib/api/learning";
import {
  completeLessonMaterial,
  readMaterialProgress,
  writeMaterialProgress,
  readLessonTestAttempt,
} from "@/lib/api/learning-progress";
import { resolveMediaUrl } from "@/lib/api/media";
import type { LearningCourseResponse, LearningLessonDetail, LearningLessonSummary, LearningModule } from "@/lib/api/types/learning";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import LessonMaterialTabs from "@/components/dashboard/learning/LessonMaterialTabs";
import LessonTest from "@/components/dashboard/learning/LessonTest";
import LessonNavCard from "@/components/dashboard/learning/LessonNavCard";
import LessonVideoPlayer from "@/components/dashboard/learning/LessonVideoPlayer";
import ProtectedShell from "@/components/dashboard/learning/ProtectedShell";
import { lessonKindLabel, sidebarLessonKind } from "@/lib/learning/lesson-kind";
import {
  canOpenLesson,
  resolveLessonProgressStatus,
  sidebarLessonCode,
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

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.replace("/", "");
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v") ?? "";
  } catch {
    return "";
  }
  return "";
}

function LessonPlayer({
  url,
  isTest,
  onVideoEnded,
}: {
  url?: string;
  isTest?: boolean;
  onVideoEnded?: () => void;
}) {
  if (isTest) {
    return (
      <div className="flex h-full items-center justify-center text-white">
        <p className="text-sm">Modul testi</p>
      </div>
    );
  }

  // Video yo'q — talab chiqarilmaydi
  if (!url) return null;

  const src = resolveMediaUrl(url);
  const yt = youtubeId(src);
  if (yt) {
    return (
      <ProtectedShell className="h-full w-full">
        <iframe
          src={`https://www.youtube.com/embed/${yt}?modestbranding=1&rel=0`}
          title="Dars videosi"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
        />
      </ProtectedShell>
    );
  }

  if (src.includes("vimeo.com")) {
    const id = src.split("/").filter(Boolean).pop();
    return (
      <ProtectedShell className="h-full w-full">
        <iframe
          src={`https://player.vimeo.com/video/${id}?pip=0`}
          title="Dars videosi"
          className="h-full w-full"
          allow="autoplay; fullscreen"
        />
      </ProtectedShell>
    );
  }

  return <LessonVideoPlayer src={src} fill className="h-full w-full" onEnded={onVideoEnded} />;
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
  onOpenLesson,
  onComplete,
  onTestPassed,
}: LearningWorkspaceProps) {
  const tree = useMemo(() => ensureLearningTree(course), [course]);
  const allLessons = useMemo(() => flattenLearningLessons(tree.modules ?? []), [tree]);
  const [openModules, setOpenModules] = useState<number[]>([]);
  const [completedKeys, setCompletedKeys] = useState<Set<string>>(new Set());
  /** Test o'tildi yoki 2 urinish tugadi — FE darajasida keyingi darsni ochish */
  const [testFlowDone, setTestFlowDone] = useState(false);

  const required = useMemo(() => (lesson ? listRequiredMaterials(lesson) : []), [lesson]);
  const materialsDone = allRequiredCompleted(required, completedKeys);
  const hasTest = lesson ? lessonHasTest(lesson) : false;
  const videoRequired = required.find((r) => r.kind === "video");
  const videoDone = videoRequired ? completedKeys.has(videoRequired.key) : true;

  useEffect(() => {
    const currentModuleId =
      tree.modules?.find((module) =>
        moduleLessons(module).some((item) => item.id === selectedId || resolveLessonProgressStatus(item) === "current")
      )?.id ?? tree.modules?.[0]?.id;
    if (!currentModuleId) return;
    setOpenModules((prev) => (prev.includes(currentModuleId) ? prev : [...prev, currentModuleId]));
  }, [selectedId, tree]);

  useEffect(() => {
    if (!lesson?.id) {
      setCompletedKeys(new Set());
      setTestFlowDone(false);
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
  const completed = Boolean(lesson && resolveLessonProgressStatus(lesson) === "completed");
  const videoUrl = lesson ? lessonVideoUrl(lesson) : undefined;
  const listedLesson = lesson ? allLessons.find((item) => item.id === lesson.id) : undefined;
  const activeKind = lesson ? sidebarLessonKind(listedLesson ?? lesson) : null;
  const isTest = activeKind === "TEST";
  const duration =
    lesson?.duration_label ||
    (lesson?.duration_minutes != null ? `${lesson.duration_minutes} daqiqa` : "0 daqiqa");

  const canManualComplete = !hasTest && materialsDone && !completed;
  const lessonReadyForNext =
    completed || testFlowDone || (!hasTest && materialsDone);

  return (
    <div className="space-y-4">
      {banner}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <aside className="min-w-0">
          <h2 className="break-words font-bold text-[#0C2340]">{tree.title || "Kurs tarkibi"}</h2>
          <p className="mt-1 text-xs text-[#64748B]">
            Jarayon: {tree.progress_percent ?? 0}%
            {tree.has_tests ? " · Testlar mavjud" : ""}
          </p>
          <div className="mt-4 space-y-4">
            {(tree.modules ?? []).map((module, moduleIndex) => {
              const moduleId = module.id || moduleIndex + 1;
              const expanded = openModules.includes(moduleId);
              return (
                <div key={moduleId} className="rounded-2xl border border-[#E8EDF5] bg-white p-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenModules((prev) =>
                        prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
                      )
                    }
                    className="flex min-h-11 w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="min-w-0 break-words text-sm font-semibold uppercase tracking-wide text-[#0C2340]">
                      {module.title}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-[#2563EB] transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>

                  {expanded ? (
                    moduleLessons(module).length ? (
                      <ul className="mt-3 space-y-3">
                        {moduleLessons(module).map((item, index) => {
                          const progressStatus = resolveLessonProgressStatus(item);
                          const kind = sidebarLessonKind(item);
                          const disabled = !canLearn || !canOpenLesson(progressStatus);
                          return (
                            <li key={item.id}>
                              <LessonNavCard
                                kind={kind}
                                code={sidebarLessonCode(module, item, index, moduleIndex)}
                                title={item.title}
                                progressStatus={progressStatus}
                                selected={selectedId === item.id}
                                disabled={disabled}
                                hasTests={item.has_tests === true || (item.test_count ?? 0) > 0}
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

        <div className="space-y-4">
          {!canLearn ? empty : null}
          {canLearn && lessonLoading && !lesson ? <LoadingState /> : null}
          {canLearn && lesson ? (
            <>
              {videoUrl ? (
                <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-[#0C2340]">
                  <div className="aspect-video">
                    <LessonPlayer
                      url={videoUrl}
                      isTest={isTest}
                      onVideoEnded={() => {
                        if (videoRequired && !videoDone) {
                          void markComplete({
                            key: videoRequired.key,
                            materialId: videoRequired.materialId,
                          });
                        }
                      }}
                    />
                  </div>
                  {!videoDone && videoRequired ? (
                    <div className="flex flex-col items-stretch justify-between gap-3 border-t border-white/10 px-4 py-3 sm:flex-row sm:items-center">
                      <p className="text-sm text-white/80">Videoni ko&apos;rib chiqing</p>
                      <button
                        type="button"
                        onClick={() =>
                          void markComplete({
                            key: videoRequired.key,
                            materialId: videoRequired.materialId,
                          })
                        }
                        className="min-h-11 w-full rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-[#0C2340] sm:w-auto"
                      >
                        Videoni tugatdim
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-sm sm:p-6">
                {lesson.status_label ? (
                  <DashboardBadge
                    variant={
                      completed
                        ? "success"
                        : resolveLessonProgressStatus(lesson) === "locked"
                          ? "neutral"
                          : "default"
                    }
                  >
                    {lesson.status_label}
                  </DashboardBadge>
                ) : (
                  <DashboardBadge>Hozirgi dars</DashboardBadge>
                )}
                <h1 className="mt-2 break-words text-xl font-bold text-[#0C2340]">{lesson.title}</h1>
                {activeKind ? (
                  <span
                    className={
                      activeKind === "PRACTICAL"
                        ? "mt-2 inline-flex rounded-md bg-[#F59E0B] px-3 py-1.5 text-sm font-bold text-white"
                        : activeKind === "TEST"
                          ? "mt-2 inline-flex rounded-md bg-slate-500 px-3 py-1.5 text-sm font-bold text-white"
                          : "mt-2 inline-flex rounded-md bg-[#2563EB] px-3 py-1.5 text-sm font-bold text-white"
                    }
                  >
                    {lessonKindLabel(activeKind)}
                  </span>
                ) : null}
                {lesson.module_title ? <p className="mt-1 text-sm text-[#64748B]">{lesson.module_title}</p> : null}
                <p className="mt-1 text-xs text-[#64748B]">
                  {[duration, lesson.teacher_name ? `O'qituvchi: ${lesson.teacher_name}` : ""].filter(Boolean).join(" · ")}
                </p>

                {required.length > 0 ? (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {required.map((r) => {
                      const done = completedKeys.has(r.key);
                      return (
                        <li
                          key={r.key}
                          className={cn(
                            "rounded-md px-2 py-1 text-xs font-medium",
                            done ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {done ? "✓" : "○"} {r.label}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                <LessonMaterialTabs
                  key={lesson.id}
                  lesson={lesson}
                  completedKeys={completedKeys}
                  onMarkComplete={(opts) => void markComplete(opts)}
                />

                <LessonTest
                  key={`test-${lesson.id}`}
                  lessonId={lesson.id}
                  materials={[...(lesson.tests ?? []), ...(lesson.materials ?? [])]}
                  materialsUnlocked={materialsDone}
                  courseTitle={tree.title}
                  moduleTitle={lesson.module_title}
                  lessonTitle={lesson.title}
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
            </>
          ) : canLearn && !lessonLoading ? (
            <p className="text-[#64748B]">
              {allLessons.length ? "Dars tanlang." : "Modulda darslar hali yuklanmagan."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
