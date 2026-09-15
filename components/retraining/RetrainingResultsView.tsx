"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle, ClipboardCheck, TrendingUp } from "lucide-react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import StatCard from "@/components/dashboard/ui/StatCard";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { formatDate } from "@/lib/dashboard/utils";
import type { StoredTestResultRow } from "@/lib/api/learning-progress";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { retrainingListMyCourses, retrainingListResults } from "@/lib/retraining/service";
import { RETRAINING_SELECT_PATH } from "@/lib/auth/program";
import { useRouter } from "@/i18n/navigation";
import {
  isRetrainingTypeMissingError,
  useRequireRetrainingType,
} from "@/lib/retraining/use-require-type";

function groupAttempts(items: StoredTestResultRow[]) {
  const map = new Map<string, StoredTestResultRow[]>();
  for (const item of items) {
    const key = `${item.courseTitle ?? ""}|${item.lessonId}|${item.testId}|${item.lessonTitle ?? ""}`;
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return [...map.values()].map((attempts) => {
    const sorted = [...attempts].sort((a, b) => (a.attempt ?? 0) - (b.attempt ?? 0));
    return { attempts: sorted, latest: sorted[sorted.length - 1] };
  });
}

export default function RetrainingResultsView() {
  const { badge } = useStudentProgramPaths();
  const router = useRouter();
  const requireType = useRequireRetrainingType();
  const [items, setItems] = useState<StoredTestResultRow[]>([]);
  const [lessonStats, setLessonStats] = useState({ total: 0, completed: 0, progress: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const type = await requireType();
      if (!type) return;
      const [results, my] = await Promise.all([
        retrainingListResults(type),
        retrainingListMyCourses(type),
      ]);
      const totals = my.reduce(
        (acc, course) => {
          acc.total += course.total_lessons ?? 0;
          acc.completed += course.completed_lessons ?? 0;
          acc.progress += course.progress_percent ?? 0;
          return acc;
        },
        { total: 0, completed: 0, progress: 0 }
      );
      setLessonStats({
        total: totals.total,
        completed: totals.completed,
        progress: my.length ? Math.round(totals.progress / my.length) : 0,
      });
      setItems(results);
      setError(null);
    } catch (caught) {
      if (isRetrainingTypeMissingError(caught)) {
        router.replace(RETRAINING_SELECT_PATH);
        return;
      }
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, [requireType, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = selectedId ? items.find((row) => row.id === selectedId) ?? null : null;
  const groups = useMemo(() => groupAttempts(items), [items]);
  const stats = useMemo(() => {
    const withPct = items.filter((row) => row.percentage != null || row.score != null);
    const values = withPct.map((row) => row.percentage ?? row.score ?? 0);
    return {
      tests: groups.length,
      avg: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0,
      best: values.length ? Math.max(...values) : 0,
    };
  }, [groups.length, items]);

  return (
    <div className="min-w-0">
      <PageHeader
        title="Natija"
        description={`${badge} test natijalari. Har bir urinish alohida saqlanadi.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Jami darslar" value={lessonStats.total} icon={ClipboardCheck} />
        <StatCard label="Tugallangan darslar" value={lessonStats.completed} icon={CheckCircle} />
        <StatCard label="Testlar soni" value={stats.tests} icon={Award} />
        <StatCard label="O'rtacha natija" value={stats.avg} suffix="%" icon={TrendingUp} />
        <StatCard label="Eng yaxshi natija" value={stats.best} suffix="%" icon={Award} />
        <StatCard label="Kurs progress" value={lessonStats.progress} suffix="%" icon={TrendingUp} />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : !items.length ? (
        <EmptyState
          icon={Award}
          title="Hozircha natijalar mavjud emas."
          description="Qayta tayyorlash dars testini topshirgach, urinishlar shu yerda chiqadi."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const head = group.latest;
            return (
              <article
                key={head.id}
                className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-sm font-semibold text-[#0C2340]">
                      {head.testTitle || head.lessonTitle || `Dars #${head.lessonId}`}
                    </h3>
                    <p className="mt-1 break-words text-xs text-[#64748B]">
                      {[head.courseTitle, head.moduleTitle, head.lessonTitle].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <DashboardBadge variant={head.passed ? "success" : "danger"}>
                    {head.passed ? "O'tdi" : "O'tmadi"}
                  </DashboardBadge>
                </div>
                <ul className="mt-3 space-y-2">
                  {group.attempts.map((row) => (
                    <li key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F9FC] px-3 py-2">
                      <span className="text-sm text-[#334155]">
                        {row.attempt != null ? `${row.attempt}-urinish` : "Urinish"}
                        <span className="ml-2 font-semibold">
                          {row.percentage != null || row.score != null ? `${row.percentage ?? row.score}%` : "—"}
                        </span>
                      </span>
                      <DashboardBadge variant={row.passed ? "success" : "danger"}>
                        {row.passed ? "O'tdi" : "O'tmadi"}
                      </DashboardBadge>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[#94A3B8]">{formatDate(head.date)}</p>
                <button
                  type="button"
                  onClick={() => setSelectedId(head.id)}
                  className="mt-3 min-h-11 w-full rounded-xl border border-[#E8EDF5] text-sm font-medium text-[#2563EB] md:w-auto md:px-4"
                >
                  Ko&apos;rish
                </button>
              </article>
            );
          })}
        </div>
      )}

      <DashboardModal open={!!selected} onClose={() => setSelectedId(null)} title="Natija tafsilotlari">
        {selected ? (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p><strong>Kurs:</strong> {selected.courseTitle || "—"}</p>
            <p><strong>Modul:</strong> {selected.moduleTitle || "—"}</p>
            <p><strong>Dars:</strong> {selected.lessonTitle || selected.lessonId}</p>
            <p><strong>Test:</strong> {selected.testTitle || selected.testId}</p>
            <p><strong>Urinish:</strong> {selected.attempt != null ? `${selected.attempt}-urinish` : "—"}</p>
            <p><strong>Ball:</strong> {selected.score != null ? selected.score : "—"}</p>
            <p>
              <strong>Foiz:</strong>{" "}
              {selected.percentage != null || selected.score != null ? `${selected.percentage ?? selected.score}%` : "—"}
            </p>
            <p><strong>Natija:</strong> {selected.passed ? "O'tdi" : "O'tmadi"}</p>
            <p><strong>Sana:</strong> {formatDate(selected.date)}</p>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}
