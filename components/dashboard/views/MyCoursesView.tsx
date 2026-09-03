"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getMyApplications } from "@/lib/api/applications";
import { getLearningCourse, getMyLearningCourses, lessonUiStatus } from "@/lib/api/learning";
import { getCatalogCourse } from "@/lib/dashboard/qualification-catalog";
import { mergeLearningWithCatalog } from "@/lib/learning/workspace-tree";
import { getMandatoryBlogsDetailed } from "@/lib/api/mandatory-blogs";
import { readMandatorySnapshot } from "@/lib/api/mandatory-snapshot";
import { resolveMediaUrl } from "@/lib/api/media";
import {
  applicationCourseTitle,
  courseOpenHref,
  findEducationCourseForApplication,
  isApprovedApplicationStatus,
  isMandatoryBlockCourse,
} from "@/lib/dashboard/course-application";
import { overlayEducationCourseWithPublished, publishedTreeForTitle } from "@/lib/dashboard/education-catalog";
import {
  matchPublishedDirectionByTitle,
  readQualificationSnapshot,
} from "@/lib/qualification/published-snapshot";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import {
  mapMandatoryBlogToDirection,
  publishedMandatoryBlogs,
  upcomingFromMandatoryBlogs,
} from "@/lib/dashboard/mandatory-map";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import type { LiveRefreshReason } from "@/lib/live/refresh-bus";
import type {
  CourseDetailResponse,
} from "@/lib/api/types/courses";
import type { LearningCourseResponse } from "@/lib/api/types/learning";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { CourseCatalogItem, DirectionStats, MyDirection, UpcomingLesson } from "@/lib/dashboard/types";
import { lessonProgressOf, continueFromCourse } from "@/lib/dashboard/continue-learning";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import DirectionCard from "@/components/dashboard/directions/DirectionCard";
import DirectionStatsRow from "@/components/dashboard/directions/DirectionStatsRow";
import DirectionTabs, { type DirectionTabId } from "@/components/dashboard/directions/DirectionTabs";
import UpcomingLessonsCard from "@/components/dashboard/directions/UpcomingLessonsCard";
import LoadingState from "@/components/dashboard/ui/LoadingState";

function buildStats(items: MyDirection[]): DirectionStats {
  return {
    total: items.length,
    active: items.filter((item) => item.status === "active").length,
    completed: items.filter((item) => item.status === "completed").length,
    archived: items.filter((item) => item.status === "archived").length,
    studyHours: items.reduce((sum, item) => sum + item.totalHours, 0),
  };
}

function upcomingFromLearning(course: LearningCourseResponse): UpcomingLesson | null {
  const lessons = (course.modules ?? []).flatMap((module) => module.lessons ?? module.items ?? []);
  const current =
    lessons.find((item) => item.id === course.current_lesson_id) ??
    lessons.find((item) => lessonUiStatus(item) === "current") ??
    lessons.find((item) => lessonUiStatus(item) !== "locked");
  if (!current) return null;
  const module = (course.modules ?? []).find((item) =>
    (item.lessons ?? item.items ?? []).some((lesson) => lesson.id === current.id)
  );
  return {
    id: `learning-lesson-${current.id}`,
    directionId: String(course.id),
    directionTitle: course.title,
    moduleTitle: module ? `${module.title}: ${current.title}` : current.title,
    date: "today",
    time: "ochiq",
    type: current.item_type === "test" || String(current.lesson_type).toUpperCase() === "TEST" ? "test" : "lesson",
    tone: "blue",
    href: `/dashboard/learning/${course.id}`,
  };
}

function withPublishedModules(
  direction: MyDirection,
  published: QualificationDirection[],
  fallbackCount = 0
): MyDirection {
  const tree = publishedTreeForTitle(published, direction.title);
  if (!tree.modules.length) {
    return { ...direction, modules: direction.modules || fallbackCount };
  }
  return {
    ...direction,
    modules: tree.modules.length,
    moduleTitles: tree.modules.map((module) => module.title),
    totalHours: tree.hours || direction.totalHours,
  };
}

function upcomingFromCatalog(course: CourseCatalogItem, href: string): UpcomingLesson | null {
  const module = course.syllabus.find((item) => item.lessons.length > 0) ?? course.syllabus[0];
  if (!module) return null;
  const lesson = module.lessons[0];
  return {
    id: `catalog-${course.id}-${module.id}`,
    directionId: course.id,
    directionTitle: course.title,
    moduleTitle: lesson ? `${module.title}: ${lesson.title}` : module.title,
    date: "today",
    time: "ochiq",
    type: "lesson",
    tone: "blue",
    href,
  };
}

function approvedDirectionFromCourse(
  application: ClientApplicationResponse | null,
  course: CourseDetailResponse,
  learning: LearningCourseResponse | null
): MyDirection | null {
  if (isMandatoryBlockCourse({ title: course.title })) return null;

  const totalHours = course.duration_hours ?? 0;
  const learningProgress = learning ? lessonProgressOf(learning) : null;
  const continueInfo = learning ? continueFromCourse(learning) : null;
  const progress = learningProgress?.progressPercent ?? 0;
  const completedHours = totalHours > 0 ? Math.round((totalHours * progress) / 100) : 0;
  const modules = course.modules?.length ?? course.module_count ?? 0;
  const startDate =
    (application?.approved_at ?? application?.updated_at ?? application?.created_at ?? "").slice(0, 10);

  return {
    id: `approved-course-${course.id}`,
    title: course.title,
    image: resolveMediaUrl(course.thumbnail_url) || "/images/directions/d1.jpg",
    category: course.category_name || "Malaka oshirish",
    totalHours,
    completedHours,
    modules,
    moduleTitles: (course.modules ?? []).map((module) => module.title),
    language: course.language_label || course.language || "O'zbek tili",
    startDate,
    progress,
    status: progress >= 100 ? "completed" : "active",
    currentLessonId: continueInfo ? String(continueInfo.currentLessonId ?? course.id) : String(course.id),
    currentLessonTitle: continueInfo?.currentLessonTitle,
    completedLessons: learningProgress?.completedLessons,
    totalLessons: learningProgress?.totalLessons,
    progressColor: progress >= 100 ? "green" : progress >= 30 ? "blue" : "orange",
    badgeClass: "bg-[#0AA64F]",
    showActions: true,
    detailHref: `/dashboard/learning/${course.id}`,
    continueHref: continueInfo?.href ?? `/dashboard/learning/${course.id}`,
  };
}

function approvedDirectionFromCatalog(
  application: ClientApplicationResponse,
  course: CourseCatalogItem
): MyDirection {
  const href = courseOpenHref(course, application);
  const startDate = (application.approved_at ?? application.updated_at ?? application.created_at ?? "").slice(0, 10);

  return {
    id: `approved-catalog-${course.id}`,
    title: course.title,
    image: course.thumbnailUrl || "/images/directions/d1.jpg",
    category: course.direction || "Malaka oshirish",
    totalHours: course.hours,
    completedHours: 0,
    modules: course.modulesCount,
    moduleTitles: course.syllabus.map((module) => module.title),
    language: course.language,
    startDate,
    progress: 0,
    status: "active",
    currentLessonId: course.id,
    progressColor: "blue",
    badgeClass: "bg-[#0AA64F]",
    showActions: true,
    detailHref: href,
    continueHref: href,
  };
}

export default function MyCoursesView() {
  const [tab, setTab] = useState<DirectionTabId>("all");
  const [directions, setDirections] = useState<MyDirection[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const loadDirections = useCallback(async (silent = false, reason?: LiveRefreshReason) => {
    if (!silent) setLoading(true);
    try {
      setError(null);
      const blogs =
        silent && reason === "tick"
          ? await readMandatorySnapshot({ forceNetwork: true })
          : await getMandatoryBlogsDetailed(true).catch(() =>
              readMandatorySnapshot({ forceNetwork: true })
            );

      const apps = silent && reason === "tick"
        ? null
        : await getMyApplications().catch(() => []);

      const snapshot = await readQualificationSnapshot({ forceNetwork: true }).catch(
        () => [] as QualificationDirection[]
      );

      const enrolledCourses =
        silent && reason === "tick" ? [] : await getMyLearningCourses(true);

      const visibleBlogs = publishedMandatoryBlogs(blogs);
      const mandatoryDirections = visibleBlogs.length
        ? visibleBlogs.map(mapMandatoryBlogToDirection)
        : silent
          ? null
          : [];

      const mandatoryUpcoming = visibleBlogs.length ? upcomingFromMandatoryBlogs(visibleBlogs) : [];
      if (mandatoryDirections) {
        setUpcoming(mandatoryUpcoming);
      }

      if (apps) {
        const published = snapshot;
        const approved = apps.filter((item) => isApprovedApplicationStatus(item.status));

        const approvedRows = await Promise.all(
          approved.map(async (application) => {
            const localRaw = findEducationCourseForApplication(application, published);
            const local = localRaw ? overlayEducationCourseWithPublished(localRaw, published) : null;
            const title = local?.title || applicationCourseTitle(application.title);
            const match = matchPublishedDirectionByTitle(published, title);
            const numeric =
              application.course_id ??
              (match?.itId && match.itId > 0 ? match.itId : null) ??
              (match?.id && match.id > 0 ? match.id : null);

            let course = null as CourseDetailResponse | null;
            let learning = null as LearningCourseResponse | null;
            if (numeric) {
              [course, learning] = await Promise.all([
                getCatalogCourse(String(numeric)).catch(() => null),
                getLearningCourse(numeric, true).catch(() => null),
              ]);
            }

            if (course) {
              const filtered = learning ? mergeLearningWithCatalog(learning, course) : null;
              const direction = approvedDirectionFromCourse(application, course, filtered);
              if (direction) {
                const href = courseOpenHref(
                  { id: String(course.id), title: course.title },
                  application
                );
                return {
                  direction: withPublishedModules(direction, published, local?.modulesCount ?? course.modules?.length ?? 0),
                  upcoming:
                    (filtered ? upcomingFromLearning(filtered) : null) ??
                    (local ? upcomingFromCatalog(local, href) : null),
                };
              }
            }

            if (!local) {
              return { direction: null as MyDirection | null, upcoming: null as UpcomingLesson | null };
            }
            const href = courseOpenHref(local, application);
            return {
              direction: withPublishedModules(
                approvedDirectionFromCatalog(application, local),
                published,
                local.modulesCount
              ),
              upcoming: upcomingFromCatalog(local, href),
            };
          })
        );

        const enrolledRows = enrolledCourses
          .filter((item) => item.enrolled === true || isApprovedApplicationStatus(item.application_status))
          .map((learning) => {
            const already = approvedRows.some(
              (row) =>
                row.direction &&
                (row.direction.title.trim().toLowerCase() === learning.title.trim().toLowerCase() ||
                  row.direction.id === `approved-course-${learning.id}`)
            );
            if (already || isMandatoryBlockCourse({ title: learning.title })) return null;
            const stubApp = {
              id: 0,
              title: learning.title,
              status: "approved",
            } as ClientApplicationResponse;
            const catalogStub: CourseDetailResponse = {
              id: learning.id,
              title: learning.title,
              modules: (learning.modules ?? []).map((module) => ({
                id: module.id,
                title: module.title,
                order_index: module.order_index,
                status: module.status,
                lessons: (module.lessons ?? module.items ?? []).map((lesson) => ({
                  id: lesson.id,
                  title: lesson.title,
                  status: lesson.status,
                  lesson_type: lesson.lesson_type,
                  item_type: lesson.item_type,
                })),
              })),
              module_count: learning.modules?.length ?? 0,
            };
            const direction = approvedDirectionFromCourse(stubApp, catalogStub, learning);
            if (!direction) return null;
            return {
              direction: withPublishedModules(direction, published, catalogStub.module_count),
              upcoming: upcomingFromLearning(learning),
            };
          })
          .filter((row): row is { direction: MyDirection; upcoming: UpcomingLesson | null } => Boolean(row));

        const seen = new Set<string>();
        const approvedDirections: MyDirection[] = [];
        for (const row of [...approvedRows, ...enrolledRows]) {
          if (!row.direction) continue;
          const key = row.direction.title.trim().toLowerCase();
          if (seen.has(row.direction.id) || seen.has(key)) continue;
          seen.add(row.direction.id);
          seen.add(key);
          approvedDirections.push(row.direction);
        }
        const learningUpcoming = [...approvedRows, ...enrolledRows]
          .map((row) => row.upcoming)
          .filter((item): item is UpcomingLesson => item !== null);

        setUpcoming([...mandatoryUpcoming, ...learningUpcoming].slice(0, 4));

        setDirections((prev) => {
          const mandatory =
            mandatoryDirections ??
            prev.filter((item) => item.id.startsWith("mandatory"));
          return [...mandatory, ...approvedDirections];
        });
      } else if (mandatoryDirections) {
        setDirections((prev) => {
          const approved = prev
            .filter((item) => !item.id.startsWith("mandatory") && item.id !== "mandatory-block")
            .map((item) => withPublishedModules(item, snapshot, item.modules));
          return [...mandatoryDirections, ...approved];
        });
      } else {
        setDirections((prev) =>
          prev.map((item) =>
            item.id.startsWith("mandatory") ? item : withPublishedModules(item, snapshot, item.modules)
          )
        );
      }
    } catch (caught) {
      if (!silent) {
        setError(caught);
        setDirections([]);
        setUpcoming([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirections(false);
  }, [loadDirections]);

  useLiveRefresh((reason) => void loadDirections(true, reason));

  const counts = useMemo(
    () => ({
      all: directions.length,
      active: directions.filter((item) => item.status === "active").length,
      completed: directions.filter((item) => item.status === "completed").length,
    }),
    [directions]
  );

  const filtered = useMemo(() => {
    return directions.filter((item) => {
      if (tab !== "all" && item.status !== tab) return false;
      return true;
    });
  }, [directions, tab]);

  const stats = useMemo(() => buildStats(directions), [directions]);

  if (loading) {
    return <LoadingState className="px-6 pt-2 pb-8" />;
  }

  if (error) {
    return (
      <div className="px-4 pt-2 pb-8 sm:px-6">
        <ErrorState error={error} onRetry={() => void loadDirections(false)} />
      </div>
    );
  }

  return (
    <div className="px-4 pt-2 pb-8 sm:px-6">
      <div className="border-b border-[#E8EDF5]">
        <DirectionTabs active={tab} counts={counts} onChange={setTab} />
      </div>

      <div className="mt-5">
        <DirectionStatsRow stats={stats} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,1.15fr)]">
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={directions.length === 0 ? "Faol yo'nalish yo'q" : "Yo'nalish topilmadi"}
              description={
                directions.length === 0
                  ? "Tasdiqlangan yo'nalish shu yerda chiqadi. Avval malaka oshirish yo'nalishiga ariza yuboring."
                  : "Holatni o'zgartirib ko'ring."
              }
              action={
                directions.length === 0 ? (
                  <Link
                    href="/dashboard/courses"
                    className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
                  >
                    Yo'nalishlarni ko'rish
                  </Link>
                ) : undefined
              }
            />
          ) : (
            <div className="space-y-[13px]">
              {filtered.map((direction) => (
                <DirectionCard key={direction.id} direction={direction} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <UpcomingLessonsCard lessons={upcoming} />
        </div>
      </div>
    </div>
  );
}
