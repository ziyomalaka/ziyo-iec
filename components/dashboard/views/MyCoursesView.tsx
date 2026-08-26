"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { getMyApplications } from "@/lib/api/applications";
import { getLearningCourse, lessonUiStatus } from "@/lib/api/learning";
import { getCatalogCourse } from "@/lib/dashboard/qualification-catalog";
import { mergeLearningWithCatalog } from "@/lib/learning/workspace-tree";
import { getMandatoryBlogsDetailed } from "@/lib/api/mandatory-blogs";
import { readMandatorySnapshot } from "@/lib/api/mandatory-snapshot";
import { resolveMediaUrl } from "@/lib/api/media";
import { isMandatoryBlockCourse } from "@/lib/dashboard/course-application";
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
import type { DirectionStats, MyDirection, UpcomingLesson } from "@/lib/dashboard/types";
import EmptyState from "@/components/dashboard/ui/EmptyState";
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

function approvedDirectionFromCourse(
  application: ClientApplicationResponse,
  course: CourseDetailResponse,
  learning: LearningCourseResponse | null
): MyDirection | null {
  if (!application.course_id || isMandatoryBlockCourse({ title: course.title })) return null;

  const totalHours = course.duration_hours ?? 0;
  const progress = Math.max(0, Math.min(100, Math.round(learning?.progress_percent ?? 0)));
  const completedHours = totalHours > 0 ? Math.round((totalHours * progress) / 100) : 0;
  const modules = course.modules?.length ?? course.module_count ?? 0;
  const startDate = (application.approved_at ?? application.updated_at ?? application.created_at ?? "").slice(0, 10) || "2026-08-18";

  return {
    id: `approved-course-${course.id}`,
    title: course.title,
    image: resolveMediaUrl(course.thumbnail_url) || "/images/directions/d1.jpg",
    category: course.category_name || "Malaka oshirish",
    totalHours,
    completedHours,
    modules,
    language: course.language_label || course.language || "O'zbek tili",
    startDate,
    progress,
    status: progress >= 100 ? "completed" : "active",
    currentLessonId: String(course.id),
    progressColor: progress >= 100 ? "green" : progress >= 30 ? "blue" : "orange",
    badgeClass: "bg-[#0AA64F]",
    showActions: true,
    detailHref: `/dashboard/learning/${course.id}`,
    continueHref: `/dashboard/learning/${course.id}`,
  };
}

export default function MyCoursesView() {
  const [tab, setTab] = useState<DirectionTabId>("all");
  const [directions, setDirections] = useState<MyDirection[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDirections = useCallback(async (silent = false, reason?: LiveRefreshReason) => {
    if (!silent) setLoading(true);
    try {
      const blogs =
        silent && reason === "tick"
          ? await readMandatorySnapshot({ forceNetwork: true })
          : await getMandatoryBlogsDetailed(true).catch(() =>
              readMandatorySnapshot({ forceNetwork: true })
            );

      const apps = silent && reason === "tick"
        ? null
        : await getMyApplications().catch(() => []);

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
        const approved = apps.filter(
          (item, index, list) =>
            item.status === "approved" &&
            item.course_id &&
            list.findIndex((other) => other.course_id === item.course_id && other.status === "approved") === index
        );

        const approvedRows = await Promise.all(
          approved.map(async (application) => {
            const id = application.course_id;
            if (!id) return { direction: null as MyDirection | null, upcoming: null as UpcomingLesson | null };
            const [course, learning] = await Promise.all([
              getCatalogCourse(String(id)).catch(() => null),
              getLearningCourse(id, true).catch(() => null),
            ]);
            if (!course) return { direction: null as MyDirection | null, upcoming: null as UpcomingLesson | null };
            const filtered = learning ? mergeLearningWithCatalog(learning, course) : null;
            return {
              direction: approvedDirectionFromCourse(application, course, filtered),
              upcoming: filtered ? upcomingFromLearning(filtered) : null,
            };
          })
        );

        const approvedDirections = approvedRows
          .map((row) => row.direction)
          .filter((item): item is MyDirection => item !== null);
        const learningUpcoming = approvedRows
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
          const approved = prev.filter((item) => !item.id.startsWith("mandatory") && item.id !== "mandatory-block");
          return [...mandatoryDirections, ...approved];
        });
      }
    } catch {
      if (!silent) {
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

  return (
    <div className="px-6 pt-2 pb-8">
      <div className="border-b border-[#E8EDF5]">
        <DirectionTabs active={tab} counts={counts} onChange={setTab} />
      </div>

      <div className="mt-5">
        <DirectionStatsRow stats={stats} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(320px,1.15fr)]">
        <div className="min-w-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="Yo'nalish topilmadi"
              description="Holatni o'zgartirib ko'ring."
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
