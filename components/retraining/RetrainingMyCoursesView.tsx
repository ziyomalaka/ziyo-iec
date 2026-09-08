"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  continueFromRetrainingMyCourse,
  getRetrainingLearningCourse,
  getRetrainingMyCourses,
} from "@/lib/api/retraining";
import type { RetrainingMyCourseItem } from "@/lib/api/types/retraining";
import { continueFromCourse, lessonProgressOf } from "@/lib/dashboard/continue-learning";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { formatDate } from "@/lib/dashboard/utils";

type MyRetrainingCourse = {
  id: number;
  title: string;
  startedAt: string;
  statusLabel: string;
  moduleCount: number;
  totalLessons: number;
  completedLessons: number;
  progress: number;
  currentLessonTitle: string;
  href: string;
};

function mapFromMyCourse(item: RetrainingMyCourseItem, currentLessonTitle = ""): MyRetrainingCourse {
  const next = continueFromRetrainingMyCourse(item);
  const progress = Math.max(0, Math.min(100, item.progress_percent ?? 0));
  return {
    id: item.course_id,
    title: item.course_title,
    startedAt: (item.enrolled_at ?? "").slice(0, 10),
    statusLabel: progress >= 100 ? "Tugallangan" : "Faol",
    moduleCount: item.module_count ?? 0,
    totalLessons: item.total_lessons ?? 0,
    completedLessons: item.completed_lessons ?? 0,
    progress,
    currentLessonTitle,
    href: next.href,
  };
}

export default function RetrainingMyCoursesView() {
  const [items, setItems] = useState<MyRetrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const enrolled = await getRetrainingMyCourses();
      const cards = await Promise.all(
        enrolled.map(async (item) => {
          const learning = await getRetrainingLearningCourse(item.course_id, true).catch(() => null);
          if (!learning) return mapFromMyCourse(item);
          const progress = lessonProgressOf(learning);
          const next = continueFromCourse(learning, "/retraining/learning");
          return {
            id: item.course_id,
            title: learning.title || item.course_title,
            startedAt: (item.enrolled_at ?? "").slice(0, 10),
            statusLabel: progress.progressPercent >= 100 ? "Tugallangan" : "Faol",
            moduleCount: learning.modules?.length ?? item.module_count ?? 0,
            totalLessons: progress.totalLessons || item.total_lessons || 0,
            completedLessons: progress.completedLessons || item.completed_lessons || 0,
            progress: progress.progressPercent || item.progress_percent || 0,
            currentLessonTitle: next.currentLessonTitle,
            href: next.href,
          } satisfies MyRetrainingCourse;
        })
      );
      setItems(cards);
      setError(null);
    } catch (caught) {
      if (!silent) setError(caught);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  if (loading) return <LoadingState className="px-4 py-5 sm:px-6" />;
  if (error) return <ErrorState error={error} onRetry={() => void load(false)} className="mx-4 my-5" />;

  if (!items.length) {
    return (
      <div className="px-4 py-5 sm:px-6">
        <EmptyState
          icon={BookOpen}
          title="Tasdiqlangan qayta tayyorlash kurslaringiz mavjud emas."
          description="Kursga ariza yuboring. Tasdiqlangach shu yerda ochiladi."
          action={
            <Link
              href="/retraining/courses"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
            >
              Kurslarni ko&apos;rish
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-4 py-5 sm:px-6">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)] sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="min-w-0 break-words text-lg font-bold text-[#0C2340]">{item.title}</h3>
            <span className="rounded-lg bg-[#EEF4FF] px-2.5 py-1 text-xs font-semibold text-[#0756F5]">
              {item.statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-[#64748B]">
            Boshlangan sana: {item.startedAt ? formatDate(item.startedAt) : "—"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#445574]">
            <span>{item.moduleCount} modul</span>
            <span>Jami darslar: {item.totalLessons}</span>
            <span>Tugallangan: {item.completedLessons}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E8EDF5]">
              <div className="h-full rounded-full bg-[#0756F5]" style={{ width: `${item.progress}%` }} />
            </div>
            <span className="text-sm font-bold text-[#0C2340]">{item.progress}%</span>
          </div>
          <p className="mt-4 text-xs font-semibold tracking-wide text-[#64748B] uppercase">Hozirgi dars</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#0C2340]">
            {item.currentLessonTitle || "Darsni ochib davom eting"}
          </p>
          <Link
            href={item.href}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0756F5] text-sm font-semibold text-white sm:w-auto sm:px-5"
          >
            <PlayCircle className="h-5 w-5" strokeWidth={1.75} />
            O&apos;qishni davom ettirish
          </Link>
        </article>
      ))}
    </div>
  );
}
