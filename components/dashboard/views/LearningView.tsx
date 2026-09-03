"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BookMarked, PlayCircle } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { getMyApplications } from "@/lib/api/applications";
import { getCatalogCourse, overlayCatalogWithSnapshot } from "@/lib/dashboard/qualification-catalog";
import {
  completeLearningLesson,
  enrollInCourse,
  getLearningCourse,
  getLearningLesson,
  getMyLearningCourses,
  invalidateLearningCache,
  isAlreadyEnrolledError,
  isLearnForbiddenError,
} from "@/lib/api/learning";
import { getMandatoryBlog, getMandatoryBlogs } from "@/lib/api/mandatory-blogs";
import {
  readMandatorySnapshot,
  readMandatorySnapshotLocal,
} from "@/lib/api/mandatory-snapshot";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import type { LearningCourseResponse, LearningLessonDetail, LearningLessonSummary, LearningModule } from "@/lib/api/types/learning";
import {
  MANDATORY_BLOCK_TITLE,
  isApprovedApplicationStatus,
  isMandatoryBlockCourse,
  isMandatoryBlockPath,
  mandatoryLearningHref,
  parseDashboardCourseId,
  parseMandatoryBlogId,
} from "@/lib/dashboard/course-application";
import {
  flattenMandatoryLessons,
  mapMandatoryBlogToLearning,
  mapMandatoryLessonDetail,
  publishedMandatoryBlogs,
} from "@/lib/dashboard/mandatory-map";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import LearningWorkspace from "@/components/dashboard/learning/LearningWorkspace";
import {
  overlayLearningCourseKinds,
  rememberLessonKind,
  sidebarLessonKind,
} from "@/lib/learning/lesson-kind";
import {
  applySequentialUnlock,
  canOpenLesson,
  markCourseLessonCompleted,
  readCourseLessonProgress,
  readMandatoryProgress,
  resolveLessonProgressStatus,
  shouldApplySequentialUnlock,
  writeMandatoryProgress,
  type MandatoryStoredProgress,
} from "@/lib/learning/lesson-progress";
import { useIsLgUp } from "@/lib/hooks/useIsLgUp";
import { OutlineSkeleton } from "@/components/dashboard/learning/LearningSkeletons";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";
import {
  firstOpenLessonId,
  lessonDetailFromCourse,
  mergeLearningWithCatalog,
} from "@/lib/learning/workspace-tree";
import { continueFromCourse, lessonProgressOf } from "@/lib/dashboard/continue-learning";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { readQualificationSnapshot } from "@/lib/qualification/published-snapshot";

function err(error: unknown) {
  return studentApiErrorMessage(error, "lesson");
}

function lessonIdFromPath(pathname: string, fallback?: number) {
  const match = pathname.match(/\/lessons?\/(\d+)(?:\/|$)/);
  if (match) return Number(match[1]);
  return fallback;
}

function moduleLessons(module: LearningModule): LearningLessonSummary[] {
  return module.lessons ?? module.items ?? [];
}

function flattenLessons(modules: LearningModule[]) {
  return modules.flatMap(moduleLessons);
}

type LearningViewProps = {
  courseId?: string;
  initialLessonId?: number;
};

export default function LearningView({ courseId, initialLessonId }: LearningViewProps) {
  // Admin majburiy blog → student: snapshot / public-mandatory (learning course emas)
  const mandatoryBlogId = parseMandatoryBlogId(courseId);
  if (mandatoryBlogId) {
    return <MandatoryBlockPlayer blogId={mandatoryBlogId} initialLessonId={initialLessonId} />;
  }
  if (isMandatoryBlockPath(courseId)) {
    return <MandatoryBlockPlayer blogId={null} initialLessonId={initialLessonId} />;
  }
  const numericId = parseDashboardCourseId(courseId);
  if (numericId) return <LearningPlayer courseId={numericId} initialLessonId={initialLessonId} />;
  return <LearningHome />;
}

function LearningHome() {
  const router = useRouter();
  const [options, setOptions] = useState<Array<{ id: number; title: string; href: string; progress: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [apps, blogs, enrolled] = await Promise.all([
          getMyApplications().catch(() => []),
          readMandatorySnapshot({ forceNetwork: true }).catch(() => readMandatorySnapshotLocal()),
          getMyLearningCourses(true),
        ]);
        if (cancelled) return;

        const cards: Array<{ id: number; title: string; href: string; progress: number }> = [];
        const seen = new Set<number>();

        for (const course of enrolled) {
          if (!course.id || seen.has(course.id) || isMandatoryBlockCourse({ title: course.title })) continue;
          seen.add(course.id);
          const progress = lessonProgressOf(course).progressPercent;
          const href = continueFromCourse(course).href;
          cards.push({ id: course.id, title: course.title, href, progress });
        }

        for (const item of apps) {
          if (!isApprovedApplicationStatus(item.status) || !item.course_id || seen.has(item.course_id)) continue;
          seen.add(item.course_id);
          cards.push({
            id: item.course_id,
            title: item.title,
            href: `/dashboard/learning/${item.course_id}`,
            progress: 0,
          });
        }

        if (cards.length === 1) {
          router.replace(cards[0].href);
          return;
        }

        if (cards.length === 0) {
          const published = publishedMandatoryBlogs(blogs);
          const withLessons = published.find((item) => flattenMandatoryLessons(item).length > 0) ?? published[0];
          if (withLessons?.id) {
            router.replace(mandatoryLearningHref(withLessons.id));
            return;
          }
        }

        setOptions(cards);
        setError(null);
        setLoading(false);
      } catch (caught) {
        if (cancelled) return;
        setError(caught);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  if (!options.length) {
    return (
      <EmptyState
        icon={BookMarked}
        title="O'quv jarayoni ochilmagan"
        description="Tasdiqlangan yo'nalish bo'lsa, darslar shu yerda chiqadi."
        action={
          <Link href="/dashboard/courses" className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white">
            Yo'nalishlarni ko'rish
          </Link>
        }
      />
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <h2 className="text-lg font-bold text-[#0C2340]">Yo'nalishni tanlang</h2>
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

function MandatoryBlockEmptyView({ title = MANDATORY_BLOCK_TITLE }: { title?: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <aside>
        <h2 className="font-bold text-[#0C2340]">{title}</h2>
        <p className="mt-1 text-xs text-[#64748B]">Jarayon: 0%</p>
        <div className="mt-4 rounded-2xl border border-dashed border-[#DCE5F0] bg-white px-4 py-10 text-center">
          <p className="text-sm font-semibold text-[#101A37]">Darslar hali yuklanmagan</p>
          <p className="mt-1 text-xs text-[#64748B]">Material qo&apos;shilgach, shu yerda chiqadi.</p>
        </div>
      </aside>

      <div className="space-y-4">
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-[#E8EDF5] bg-[#0C2340]">
          <PlayCircle className="h-16 w-16 text-white/80" />
        </div>
        <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <DashboardBadge>Hozirgi dars</DashboardBadge>
          <h1 className="mt-2 text-xl font-bold text-[#0C2340]">{title}</h1>
          <p className="mt-3 text-sm text-[#64748B]">Ichki material hali yuklanmagan.</p>
        </div>
      </div>
    </div>
  );
}

function MandatoryBlockPlayer({ blogId, initialLessonId }: { blogId?: number | null; initialLessonId?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLg = useIsLgUp();
  const urlLessonId = lessonIdFromPath(pathname, initialLessonId);
  const courseHref = blogId ? mandatoryLearningHref(blogId) : "/dashboard/learning/mandatory";
  const [blog, setBlog] = useState<QualificationDirection | null>(null);
  const [lesson, setLesson] = useState<LearningLessonDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [progress, setProgress] = useState<MandatoryStoredProgress>({ completedIds: [], inProgressId: null });
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const selectedIdRef = useRef<number | null>(null);
  const progressRef = useRef(progress);
  selectedIdRef.current = selectedId;
  progressRef.current = progress;

  const pickLocalBlog = useCallback((): QualificationDirection | null => {
    const items = publishedMandatoryBlogs(readMandatorySnapshotLocal());
    if (blogId) return items.find((item) => item.id === blogId) ?? null;
    return items.find((item) => flattenMandatoryLessons(item).length > 0) ?? items[0] ?? null;
  }, [blogId]);

  const persistProgress = useCallback((next: MandatoryStoredProgress, blogKey: number) => {
    setProgress(next);
    writeMandatoryProgress(blogKey, next);
  }, []);

  const loadBlog = useCallback(async () => {
    // Admin publish → /api/public-mandatory; student shu snapshotni o'qiydi
    const snap = publishedMandatoryBlogs(await readMandatorySnapshot({ forceNetwork: true }));
    if (blogId) {
      const fromSnap = snap.find((item) => item.id === blogId);
      if (fromSnap && flattenMandatoryLessons(fromSnap).length > 0) return fromSnap;
      const detailed = await getMandatoryBlog(blogId, true).catch(() => null);
      if (detailed && flattenMandatoryLessons(detailed).length > 0) return detailed;
      return fromSnap ?? null;
    }
    const first = snap.find((item) => flattenMandatoryLessons(item).length > 0) ?? snap[0] ?? null;
    if (first && flattenMandatoryLessons(first).length > 0) return first;
    const blogs = publishedMandatoryBlogs(await getMandatoryBlogs({ per_page: 100 }, true).catch(() => []));
    return blogs.find((item) => flattenMandatoryLessons(item).length > 0) ?? blogs[0] ?? first;
  }, [blogId]);

  const openLesson = useCallback(
    async (source: QualificationDirection, id: number, stored: MandatoryStoredProgress) => {
      const mapped = mapMandatoryBlogToLearning(source, stored);
      const listed = flattenLessons(mapped.modules ?? []).find((item) => item.id === id);

      const nextProgress = { ...stored, inProgressId: id };
      persistProgress(nextProgress, source.id);

      setLessonLoading(true);
      try {
        const detail = mapMandatoryLessonDetail(source, id) ?? lessonDetailFromCourse(mapped, id);
        if (!detail) return;
        const kind = sidebarLessonKind(detail);
        if (kind === "THEORY" || kind === "PRACTICAL") {
          rememberLessonKind(detail.id || id, detail.title, kind);
        }
        setLesson({
          ...detail,
          lesson_type: kind,
          status: listed?.status ?? detail.status,
          status_label: listed?.status_label ?? detail.status_label ?? "Hozirgi dars",
          is_completed: listed?.is_completed,
          is_current: listed?.is_current,
        });
        setSelectedId(id);
      } finally {
        setLessonLoading(false);
      }
    },
    [persistProgress]
  );

  useEffect(() => {
    let cancelled = false;
    const local = pickLocalBlog();
    if (local) {
      const stored = readMandatoryProgress(local.id);
      setProgress(stored);
      setBlog(local);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void loadBlog()
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          if (!local) setBlog(null);
          return;
        }
        const stored = readMandatoryProgress(data.id);
        setProgress(stored);
        setBlog(data);
      })
      .catch(() => {
        if (!cancelled && !local) setBlog(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadBlog, pickLocalBlog]);

  useEffect(() => {
    if (!blog) return;
    if (urlLessonId && selectedId !== urlLessonId) {
      void openLesson(blog, urlLessonId, progress);
      return;
    }
    if (!urlLessonId && isLg && !selectedId) {
      const mapped = mapMandatoryBlogToLearning(blog, progress);
      const prefer = firstOpenLessonId(mapped);
      if (prefer) void openLesson(blog, prefer, progress);
    }
  }, [blog, urlLessonId, isLg, selectedId, openLesson, progress]);

  useLiveRefresh((reason) => {
    void (async () => {
      const data =
        reason === "focus"
          ? pickLocalBlog() ?? (await loadBlog().catch(() => null))
          : await loadBlog().catch(() => null);
      if (!data) return;
      const stored = readMandatoryProgress(data.id);
      progressRef.current = stored;
      setProgress(stored);
      setBlog(data);
      const mapped = mapMandatoryBlogToLearning(data, stored);
      const listed = flattenLessons(mapped.modules ?? []);
      const current = selectedIdRef.current;
      const stillOpen = current != null && listed.some((item) => item.id === current);
      const nextId = stillOpen ? current : firstOpenLessonId(mapped);
      if (nextId) {
        await openLesson(data, nextId, stored);
        return;
      }
      setLesson(null);
      setSelectedId(null);
    })();
  }, { skipTick: false });

  if (loading) return <OutlineSkeleton />;

  const course = blog ? overlayLearningCourseKinds(mapMandatoryBlogToLearning(blog, progress)) : null;
  const hasLessons = Boolean(blog && flattenMandatoryLessons(blog).length);
  const hasModules = Boolean(course?.modules?.length);
  if (!blog || !course || (!hasLessons && !hasModules)) {
    return <MandatoryBlockEmptyView title={blog?.title?.trim() || MANDATORY_BLOCK_TITLE} />;
  }

  const listed = lesson ? flattenLessons(course.modules ?? []).find((item) => item.id === lesson.id) : undefined;
  const active = listed
    ? { ...lesson!, status: listed.status, status_label: listed.status_label, is_completed: listed.is_completed, is_current: listed.is_current }
    : lesson;

  return (
    <LearningWorkspace
      course={course}
      lesson={active}
      selectedId={selectedId}
      canLearn
      lessonLoading={lessonLoading}
      completing={completing}
      courseHref={courseHref}
      pane={urlLessonId ? "lesson" : "outline"}
      onOpenLesson={(id) => {
        if (id !== urlLessonId) router.push(`${courseHref}/lesson/${id}`);
        void openLesson(blog, id, progress);
      }}
      onComplete={(opts) => {
        if (!selectedId || !blog || completing) return;
        const goNext = opts?.goNext ?? true;
        setCompleting(true);
        void (async () => {
          try {
            await completeLearningLesson(selectedId, true);
          } catch {
            /* majburiy blogda local progress */
          }
          const completedIds = progress.completedIds.includes(selectedId)
            ? progress.completedIds
            : [...progress.completedIds, selectedId];
          const nextProgress: MandatoryStoredProgress = {
            completedIds,
            inProgressId: null,
          };
          persistProgress(nextProgress, blog.id);
          toast.success("Dars tugatildi");
          if (!goNext) return;
          const mapped = mapMandatoryBlogToLearning(blog, nextProgress);
          const upcoming = flattenLessons(mapped.modules ?? []).find(
            (item) => resolveLessonProgressStatus(item) === "current"
          );
          if (upcoming) {
            router.push(`${courseHref}/lesson/${upcoming.id}`);
            await openLesson(blog, upcoming.id, nextProgress);
          }
        })().finally(() => setCompleting(false));
      }}
    />
  );
}

function AccessBanner({
  message,
  status,
  skipApplicationGate,
}: {
  message?: string;
  status?: string;
  skipApplicationGate?: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="font-semibold text-[#0C2340]">Darslar hozircha yopiq</p>
      <p className="mt-1 text-sm text-[#64748B]">
        {message ||
          (skipApplicationGate
            ? "Dars ochilmoqda. Sahifani yangilab qayta urinib ko'ring."
            : "Ariza tasdiqlanmaguncha darslar ochilmaydi.")}
      </p>
      {!skipApplicationGate ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "none" ? (
            <Link href="/dashboard/courses" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white">
              Katalogdan ariza yuborish
            </Link>
          ) : (
            <Link href="/dashboard/applications" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white">
              Arizalarim
            </Link>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white"
        >
          Qayta urinish
        </button>
      )}
    </div>
  );
}

async function loadLearningCourseWithKinds(courseId: number, force = false) {
  if (force) invalidateLearningCache(courseId);
  const stored = readCourseLessonProgress(courseId);
  const [data, catalog, snapshot] = await Promise.all([
    getLearningCourse(courseId),
    getCatalogCourse(String(courseId)).catch(() => null),
    readQualificationSnapshot({ forceNetwork: force }).catch(() => []),
  ]);
  const overlaid = overlayCatalogWithSnapshot(catalog, snapshot, courseId, data.title);
  const merged = mergeLearningWithCatalog(data, overlaid, stored);
  if (shouldApplySequentialUnlock(merged.modules ?? [])) {
    return applySequentialUnlock(merged, stored);
  }
  return merged;
}

function LearningPlayer({
  courseId,
  initialLessonId,
  skipApplicationGate = false,
}: {
  courseId: number;
  initialLessonId?: number;
  /** Majburiy blog: ariza shart emas, auto-enroll */
  skipApplicationGate?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLg = useIsLgUp();
  const urlLessonId = lessonIdFromPath(pathname, initialLessonId);
  const courseHref = `/dashboard/learning/${courseId}`;
  const [course, setCourse] = useState<LearningCourseResponse | null>(null);
  const courseRef = useRef<LearningCourseResponse | null>(null);
  const [lesson, setLesson] = useState<LearningLessonDetail | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const rememberCourse = (data: LearningCourseResponse) => {
    courseRef.current = data;
    setCourse(data);
    return data;
  };

  const loadCourse = useCallback(async () => {
    const data = await loadLearningCourseWithKinds(courseId);
    if (skipApplicationGate) {
      return rememberCourse({
        ...data,
        enrolled: true,
        can_learn: data.can_learn !== false,
      });
    }
    if (!data.enrolled) {
      try {
        await enrollInCourse(courseId);
      } catch (caught) {
        if (isLearnForbiddenError(caught)) throw caught;
        if (!isAlreadyEnrolledError(caught)) {
          return rememberCourse(data);
        }
      }
      const refreshed = await loadLearningCourseWithKinds(courseId);
      return rememberCourse({ ...refreshed, enrolled: true, can_learn: refreshed.can_learn || true });
    }
    return rememberCourse(data);
  }, [courseId, skipApplicationGate]);

  const openLesson = useCallback(
    async (id: number, canLearn = true) => {
      if (!canLearn && !skipApplicationGate) {
        toast.error("Darslar hozircha yopiq. Ariza tasdiqlanishini kuting.");
        return;
      }

      const tree = courseRef.current;
      const listedOpen = tree ? flattenLessons(tree.modules ?? []).find((item) => item.id === id) : undefined;
      if (tree && !listedOpen) {
        toast.error("Bu dars o'chirilgan");
        setLesson(null);
        setSelectedId(null);
        return;
      }
      if (listedOpen && !canOpenLesson(resolveLessonProgressStatus(listedOpen))) {
        toast.error("Ushbu darsga kirishga ruxsat yo'q.");
        return;
      }

      setLessonLoading(true);
      try {
        const fromApi = await getLearningLesson(id).catch((caught) => {
          if (isLearnForbiddenError(caught)) throw caught;
          return null;
        });
        const fallback = tree ? lessonDetailFromCourse(tree, id) : null;
        const data = fromApi ?? fallback;
        if (!data) {
          toast.error("Dars yuklanmadi");
          return;
        }
        const kind = sidebarLessonKind(data);
        if (kind === "THEORY" || kind === "PRACTICAL") {
          rememberLessonKind(data.id || id, data.title, kind);
        }
        setLesson({
          ...data,
          lesson_type: kind,
          materials: data.materials?.length ? data.materials : fallback?.materials ?? [],
          prev_lesson_id: data.prev_lesson_id ?? fallback?.prev_lesson_id,
          next_lesson_id: data.next_lesson_id ?? fallback?.next_lesson_id,
        });
        setSelectedId(data.id || id);
        setCourse((prev) => {
          if (!prev) return prev;
          const next = overlayLearningCourseKinds(prev);
          courseRef.current = next;
          return next;
        });
      } catch (caught) {
        if (isLearnForbiddenError(caught)) {
          toast.error(
            skipApplicationGate
              ? "Darsga kirishda xatolik. Qayta urinib ko'ring."
              : err(caught)
          );
          if (!skipApplicationGate) router.push("/dashboard/applications");
          return;
        }
        toast.error(err(caught));
      } finally {
        setLessonLoading(false);
      }
    },
    [router, skipApplicationGate]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    loadCourse()
      .then((data) => {
        if (cancelled) return;
        const allow = skipApplicationGate || data.can_learn;
        if (!allow) return;
        const prefer =
          urlLessonId &&
          flattenLessons(data.modules ?? []).some((item) => item.id === urlLessonId)
            ? urlLessonId
            : null;
        if (prefer) void openLesson(prefer, true);
      })
      .catch((caught) => {
        if (cancelled) return;
        if (isLearnForbiddenError(caught)) {
          toast.error(
            skipApplicationGate
              ? "Kursga kirishda xatolik. Qayta urinib ko'ring."
              : err(caught)
          );
          if (!skipApplicationGate) router.push("/dashboard/applications");
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
  }, [loadCourse, openLesson, router, skipApplicationGate]);

  useEffect(() => {
    if (loading || !courseRef.current || urlLessonId || selectedId) return;
    if (!isLg) return;
    const prefer = firstOpenLessonId(courseRef.current);
    if (prefer) void openLesson(prefer, skipApplicationGate || courseRef.current.can_learn === true);
  }, [isLg, loading, urlLessonId, selectedId, openLesson, skipApplicationGate]);

  useEffect(() => {
    if (!courseRef.current || !urlLessonId || selectedId === urlLessonId) return;
    if (!flattenLessons(courseRef.current.modules ?? []).some((item) => item.id === urlLessonId)) return;
    void openLesson(urlLessonId, skipApplicationGate || courseRef.current.can_learn === true);
  }, [urlLessonId, selectedId, openLesson, skipApplicationGate]);

  const refreshLive = useCallback(async () => {
    try {
      const data = await loadLearningCourseWithKinds(courseId);
      const next = skipApplicationGate
        ? { ...data, enrolled: true, can_learn: data.can_learn !== false }
        : data;
      courseRef.current = next;
      setCourse(next);
      setError(null);
      const listed = flattenLessons(next.modules ?? []);
      const current = selectedId;
      const stillOpen = current != null && listed.some((item) => item.id === current);
      const nextId = stillOpen ? current : firstOpenLessonId(next);
      if (!nextId) {
        setLesson(null);
        setSelectedId(null);
        return;
      }
      if ((!skipApplicationGate && !next.can_learn)) return;
      const lessonData = await getLearningLesson(nextId);
      const kind = sidebarLessonKind(lessonData);
      setSelectedId(lessonData.id || nextId);
      setLesson({ ...lessonData, lesson_type: kind });
    } catch {
      /* fon yangilash */
    }
  }, [courseId, selectedId, skipApplicationGate]);

  useLiveRefresh(() => void refreshLive());

  const complete = async (opts?: { goNext?: boolean }) => {
    if (!selectedId || completing) return;
    if (!skipApplicationGate && course?.can_learn !== true) return;
    const goNext = opts?.goNext ?? true;
    setCompleting(true);
    markCourseLessonCompleted(courseId, selectedId);
    try {
      const result = await completeLearningLesson(selectedId);
      toast.success("Dars tugatildi");
      const data = await loadLearningCourseWithKinds(courseId, true);
      rememberCourse(
        skipApplicationGate
          ? { ...data, enrolled: true, can_learn: data.can_learn !== false }
          : data
      );
      if (!goNext) return;
      const upcoming =
        result.nextLessonId ??
        flattenLessons(data.modules ?? []).find((item) => resolveLessonProgressStatus(item) === "current")?.id ??
        lesson?.next_lesson_id;
      if (upcoming) {
        router.push(`${courseHref}/lesson/${upcoming}`);
        await openLesson(upcoming, skipApplicationGate || data.can_learn);
      }
    } catch (caught) {
      invalidateLearningCache(courseId);
      const data = await loadLearningCourseWithKinds(courseId, true).catch(() => null);
      if (data) rememberCourse(data);
      if (isLearnForbiddenError(caught)) {
        if (!skipApplicationGate) router.push("/dashboard/applications");
        else toast.error("Darsni yakunlashda ruxsat yo'q. Qayta urinib ko'ring.");
        return;
      }
      if (goNext) {
        const upcoming = flattenLessons((data ?? course)?.modules ?? []).find(
          (item) => resolveLessonProgressStatus(item) === "current"
        );
        if (upcoming) router.push(`${courseHref}/lesson/${upcoming.id}`);
      }
      toast.error(err(caught));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) return <OutlineSkeleton />;

  if (error || !course) {
    return <ErrorState error={error} onRetry={() => window.location.reload()} />;
  }

  const canLearn = skipApplicationGate ? true : course.can_learn === true;

  return (
    <LearningWorkspace
      course={course}
      lesson={lesson}
      selectedId={selectedId}
      canLearn={canLearn}
      lessonLoading={lessonLoading}
      completing={completing}
      banner={
        !canLearn ? (
          <AccessBanner
            message={course.access_message}
            status={course.application_status}
            skipApplicationGate={skipApplicationGate}
          />
        ) : null
      }
      empty={
        <p className="rounded-xl border border-[#E8EDF5] bg-white p-6 text-sm text-[#64748B]">
          {skipApplicationGate
            ? "Darslar yuklanmoqda. Agar ochilmasa, sahifani yangilang."
            : "Ariza tasdiqlangandan keyin dars pleyeri ochiladi."}
        </p>
      }
      courseHref={courseHref}
      pane={urlLessonId ? "lesson" : "outline"}
      onOpenLesson={(id) => {
        if (id !== urlLessonId) router.push(`${courseHref}/lesson/${id}`);
        void openLesson(id, canLearn);
      }}
      onComplete={(opts) => void complete(opts)}
    />
  );
}
