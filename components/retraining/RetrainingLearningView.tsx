"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BookMarked } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import RetrainingLearningWorkspace from "@/components/retraining/RetrainingLearningWorkspace";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import { RetrainingWorkspaceSkeleton } from "@/components/dashboard/learning/LearningSkeletons";
import {
  enrollInCourse,
  getLearningCourse,
  getLearningLesson,
  invalidateLearningCache,
  isAlreadyEnrolledError,
  isLearnForbiddenError,
} from "@/lib/api/learning";
import { getCourse } from "@/lib/api/courses";
import { completeRetrainingLesson } from "@/lib/api/learning-progress";
import { COURSES_API_PREFIX, LEARNING_API_PREFIX } from "@/lib/api/student-api";
import type { LearningCourseResponse, LearningLessonDetail } from "@/lib/api/types/learning";
import { RETRAINING_SELECT_PATH } from "@/lib/auth/program";
import { parseDashboardCourseId, isApprovedApplicationStatus } from "@/lib/dashboard/course-application";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";
import { useIsLgUp } from "@/lib/hooks/useIsLgUp";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { isRetrainingApplication } from "@/lib/retraining/match";
import { retrainingListApplications, retrainingListMyCourses } from "@/lib/retraining/service";
import { isRetrainingTypeMissingError, useRequireRetrainingType } from "@/lib/retraining/use-require-type";
import { readRetrainingDirectionSnapshot } from "@/lib/retraining/direction-snapshot";
import { directionTitlesMatch } from "@/lib/qualification/oliy-directions";
import {
  buildRetrainingLearningTree,
  canReviewLesson,
  firstReviewableLessonId,
  flattenTreeLessons,
  overlayRetrainingBlockGrouping,
} from "@/lib/retraining/learning-tree";
import {
  overlayRetrainingUnlockWindow,
  RETRAINING_UNLOCK_LOCKED_MESSAGE,
} from "@/lib/retraining/lesson-unlock";
import { useRetrainingLessonUnlock } from "@/lib/retraining/use-lesson-unlock";
import type { RetrainingType } from "@/lib/retraining/kind";

const completeAttempted = new Set<number>();

function err(error: unknown) {
  return studentApiErrorMessage(error, "lesson");
}

function lessonIdFromPath(pathname: string) {
  const match = pathname.match(/\/lessons?\/(\d+)(?:\/|$)/);
  return match ? Number(match[1]) : null;
}

export default function RetrainingLearningView({ courseId }: { courseId?: string }) {
  const numericId = parseDashboardCourseId(courseId);
  if (numericId) return <RetrainingLearningPlayer courseId={numericId} />;
  return <RetrainingLearningHome />;
}

function RetrainingLearningHome() {
  const router = useRouter();
  const requireType = useRequireRetrainingType();
  const { learning, courses } = useStudentProgramPaths();
  const [options, setOptions] = useState<Array<{ id: number; title: string; href: string; progress: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const type = await requireType();
        if (!type) {
          if (!cancelled) setLoading(false);
          return;
        }
        const [apps, mine] = await Promise.all([
          retrainingListApplications(type).catch(() => []),
          retrainingListMyCourses(type).catch(() => []),
        ]);
        if (cancelled) return;
        const cards: Array<{ id: number; title: string; href: string; progress: number }> = [];
        const seen = new Set<number>();
        for (const item of mine) {
          if (!item.course_id || seen.has(item.course_id)) continue;
          seen.add(item.course_id);
          const lessonId = item.current_lesson_id;
          cards.push({
            id: item.course_id,
            title: item.course_title,
            href: lessonId ? `${learning}/${item.course_id}/lesson/${lessonId}` : `${learning}/${item.course_id}`,
            progress: item.progress_percent ?? 0,
          });
        }
        for (const item of apps) {
          if (!isApprovedApplicationStatus(item.status) || !item.course_id || seen.has(item.course_id)) continue;
          if (!isRetrainingApplication(item)) continue;
          seen.add(item.course_id);
          cards.push({
            id: item.course_id,
            title: item.title,
            href: `${learning}/${item.course_id}`,
            progress: 0,
          });
        }
        if (cards.length === 1) {
          router.replace(cards[0].href);
          return;
        }
        setOptions(cards);
        setError(null);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        if (isRetrainingTypeMissingError(caught)) {
          router.replace(RETRAINING_SELECT_PATH);
          return;
        }
        setError(caught);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [learning, requireType, router]);

  if (loading) return <RetrainingWorkspaceSkeleton />;
  if (error) {
    return (
      <ErrorState
        error={error}
        message="Ma'lumotlarni yuklab bo'lmadi."
        onRetry={() => window.location.reload()}
      />
    );
  }
  if (!options.length) {
    return (
      <EmptyState
        icon={BookMarked}
        title="O'quv jarayoni ochilmagan"
        description="Tasdiqlangan qayta tayyorlash kursi bo'lsa, darslar shu yerda chiqadi."
        action={
          <Link href={courses} className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white">
            Kurslarni ko'rish
          </Link>
        }
      />
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <h2 className="text-lg font-bold text-[#0C2340]">Yo&apos;nalishni tanlang</h2>
      {options.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          className="block rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)]"
        >
          <p className="break-words font-semibold text-[#0C2340]">{item.title}</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E8EDF5]">
              <div className="h-full rounded-full bg-[#0756F5]" style={{ width: `${item.progress}%` }} />
            </div>
            <span className="text-sm font-bold text-[#0C2340]">{item.progress}%</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

function RetrainingLearningPlayer({ courseId }: { courseId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const { learning, applications, retrainingKind } = useStudentProgramPaths();
  const requireType = useRequireRetrainingType();
  const isLg = useIsLgUp();
  const urlLessonId = lessonIdFromPath(pathname);
  const courseHref = `${learning}/${courseId}`;
  const [course, setCourse] = useState<LearningCourseResponse | null>(null);
  const courseRef = useRef<LearningCourseResponse | null>(null);
  const [lesson, setLesson] = useState<LearningLessonDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const typeRef = useRef<RetrainingType | null>(retrainingKind);
  const completingRef = useRef(false);
  const lessonCount = course ? flattenTreeLessons(buildRetrainingLearningTree(course)).length : 0;
  const unlock = useRetrainingLessonUnlock(courseId, lessonCount);
  const unlockCountRef = useRef(unlock.unlockedCount);
  unlockCountRef.current = unlock.unlockedCount;
  const gatedCourse = useMemo(
    () => (course ? overlayRetrainingUnlockWindow(course, unlock.unlockedCount) : null),
    [course, unlock.unlockedCount]
  );
  const openLessonRef = useRef<(id: number, canLearn?: boolean) => Promise<LearningLessonDetail | null>>(
    async () => null
  );

  const rememberCourse = (data: LearningCourseResponse) => {
    const tree = buildRetrainingLearningTree(data);
    const next = { ...data, progress_percent: tree.progressPercent };
    courseRef.current = next;
    setCourse(next);
    return next;
  };

  const loadCourse = useCallback(async (type: RetrainingType) => {
    const [data, catalog, published] = await Promise.all([
      getLearningCourse(courseId, false, LEARNING_API_PREFIX.retraining, type),
      getCourse(courseId, true, COURSES_API_PREFIX.retraining).catch(() => null),
      readRetrainingDirectionSnapshot({ forceNetwork: true }).catch(() => []),
    ]);
    const snapshot =
      published.find((item) => item.id === courseId) ??
      published.find((item) => directionTitlesMatch(item.title, data.title)) ??
      published.find((item) => directionTitlesMatch(item.title, catalog?.title)) ??
      null;
    const grouped = overlayRetrainingBlockGrouping(data, catalog, snapshot);
    if (!grouped.enrolled) {
      try {
        await enrollInCourse(courseId, LEARNING_API_PREFIX.retraining, type);
      } catch (caught) {
        if (isLearnForbiddenError(caught)) throw caught;
        if (!isAlreadyEnrolledError(caught)) return rememberCourse(grouped);
      }
      const refreshed = await getLearningCourse(courseId, false, LEARNING_API_PREFIX.retraining, type);
      const withCatalog = overlayRetrainingBlockGrouping(refreshed, catalog, snapshot);
      return rememberCourse({ ...withCatalog, enrolled: true, can_learn: withCatalog.can_learn || true });
    }
    return rememberCourse(grouped);
  }, [courseId]);

  const completeLesson = useCallback(
    async (lessonId: number, goNext = true) => {
      if (completingRef.current || completeAttempted.has(lessonId)) return;
      completingRef.current = true;
      completeAttempted.add(lessonId);
      setCompleting(true);
      try {
        await completeRetrainingLesson(lessonId, typeRef.current);
        toast.success("Dars tugatildi");
        invalidateLearningCache(courseId);
        const type = typeRef.current;
        if (!type) return;
        const data = await loadCourse(type);
        if (!goNext) return;
        const gated = overlayRetrainingUnlockWindow(data, unlockCountRef.current);
        const tree = buildRetrainingLearningTree(gated);
        const upcoming = flattenTreeLessons(tree).find(
          (item) => item.id !== lessonId && canReviewLesson(item)
        )?.id;
        if (upcoming) {
          router.push(`${courseHref}/lesson/${upcoming}`);
          await openLessonRef.current(upcoming, data.can_learn === true);
        }
      } catch (caught) {
        completeAttempted.delete(lessonId);
        toast.error(err(caught));
      } finally {
        completingRef.current = false;
        setCompleting(false);
      }
    },
    [courseHref, courseId, loadCourse, router]
  );

  const openLesson = useCallback(
    async (id: number, canLearn = true) => {
      const current = courseRef.current;
      const gated = current ? overlayRetrainingUnlockWindow(current, unlockCountRef.current) : null;
      const listed = gated
        ? flattenTreeLessons(buildRetrainingLearningTree(gated)).find((item) => item.id === id)
        : undefined;
      if (current && !listed) {
        toast.error("Bu dars o'chirilgan");
        return null;
      }
      if (listed && !canReviewLesson(listed)) {
        toast.error(RETRAINING_UNLOCK_LOCKED_MESSAGE);
        return null;
      }
      if (!canLearn) {
        toast.error("Darslar hozircha yopiq. Ariza tasdiqlanishini kuting.");
        return null;
      }
      setSelectedId(id);
      setLessonLoading(true);
      try {
        const fromApi = await getLearningLesson(id, false, LEARNING_API_PREFIX.retraining, typeRef.current).catch(
          (caught) => {
            if (isLearnForbiddenError(caught)) throw caught;
            return null;
          }
        );
        if (!fromApi) {
          toast.error("Dars yuklanmadi");
          return null;
        }
        setLesson(fromApi);
        return fromApi;
      } catch (caught) {
        toast.error(err(caught));
        return null;
      } finally {
        setLessonLoading(false);
      }
    },
    []
  );
  openLessonRef.current = openLesson;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      const type = await requireType();
      if (!type || cancelled) return;
      typeRef.current = type;
      return loadCourse(type);
    })()
      .then((data) => {
        if (!data || cancelled) return;
        const gated = overlayRetrainingUnlockWindow(data, unlockCountRef.current);
        const tree = buildRetrainingLearningTree(gated);
        const lessons = flattenTreeLessons(tree);
        const prefer =
          urlLessonId && lessons.some((item) => item.id === urlLessonId) ? urlLessonId : null;
        if (prefer) void openLessonRef.current(prefer, data.can_learn === true);
      })
      .catch((caught) => {
        if (cancelled) return;
        if (isRetrainingTypeMissingError(caught)) {
          router.replace(RETRAINING_SELECT_PATH);
          return;
        }
        if (isLearnForbiddenError(caught)) {
          toast.error(err(caught));
          router.push(applications);
          return;
        }
        setError(caught);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applications, loadCourse, requireType, router, urlLessonId]);

  useEffect(() => {
    if (loading || !courseRef.current || urlLessonId || selectedId) return;
    if (!isLg) return;
    const prefer = firstReviewableLessonId(
      buildRetrainingLearningTree(overlayRetrainingUnlockWindow(courseRef.current, unlockCountRef.current))
    );
    if (prefer) void openLessonRef.current(prefer, courseRef.current.can_learn === true);
  }, [isLg, loading, urlLessonId, selectedId]);

  useLiveRefresh(() => {
    const type = typeRef.current;
    if (!type || completingRef.current) return;
    invalidateLearningCache(courseId);
    void loadCourse(type).catch(() => undefined);
  });

  if (loading) return <RetrainingWorkspaceSkeleton />;
  if (error || !course) {
    return (
      <ErrorState
        error={error}
        message="Ma'lumotlarni yuklab bo'lmadi."
        onRetry={() => window.location.reload()}
      />
    );
  }

  const canLearn = course.can_learn === true;

  return (
    <RetrainingLearningWorkspace
      course={gatedCourse ?? course}
      lesson={lesson}
      selectedId={selectedId}
      canLearn={canLearn}
      unlockCountdown={unlock.allOpen ? null : unlock.countdown}
      lessonLoading={lessonLoading}
      completing={completing}
      courseHref={courseHref}
      pane={urlLessonId ? "lesson" : "outline"}
      banner={
        !canLearn ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <p className="font-semibold text-[#0C2340]">Darslar hozircha yopiq</p>
            <p className="mt-1 text-sm text-[#64748B]">
              {course.access_message || "Ariza tasdiqlanmaguncha darslar ochilmaydi."}
            </p>
            <Link
              href={applications}
              className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white"
            >
              Arizalarim
            </Link>
          </div>
        ) : null
      }
      onOpenLesson={(id) => {
        if (id !== urlLessonId) router.push(`${courseHref}/lesson/${id}`);
        void openLesson(id, canLearn);
      }}
      onComplete={(opts) => {
        if (!selectedId) return;
        void completeLesson(selectedId, opts?.goNext ?? true);
      }}
    />
  );
}
