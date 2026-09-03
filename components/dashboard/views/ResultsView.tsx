"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import StatCard from "@/components/dashboard/ui/StatCard";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { Award, TrendingUp, ClipboardCheck, CheckCircle, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/dashboard/utils";
import {
  fetchMyTestResults,
  type StoredTestResultRow,
} from "@/lib/api/learning-progress";

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

export default function ResultsView() {
  const [items, setItems] = useState<StoredTestResultRow[]>([]);
  const [source, setSource] = useState<"api" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMyTestResults();
      setItems(res.items);
      setSource(res.source);
      setError(null);
    } catch (caught) {
      setError(caught);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = selectedId ? items.find((r) => r.id === selectedId) ?? null : null;
  const groups = useMemo(() => groupAttempts(items), [items]);

  const stats = useMemo(() => {
    const withPct = items.filter((r) => r.percentage != null || r.score != null);
    const avg = withPct.length
      ? Math.round(
          withPct.reduce((s, r) => s + (r.percentage ?? r.score ?? 0), 0) / withPct.length
        )
      : 0;
    return {
      avg,
      total: items.length,
      success: items.filter((r) => r.passed).length,
      failed: items.filter((r) => !r.passed).length,
    };
  }, [items]);

  const chartItems = items.slice(0, 12).reverse();

  return (
    <div className="min-w-0">
      <PageHeader
        title="Natijalarim"
        description="Har bir test urinishi alohida saqlanadi. Testdan o'tmagan natija ham tarixda qoladi."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="O'rtacha ball" value={stats.avg} suffix="%" icon={TrendingUp} />
        <StatCard label="Topshirilgan urinishlar" value={stats.total} icon={ClipboardCheck} />
        <StatCard label="O'tdi" value={stats.success} icon={CheckCircle} />
        <StatCard label="O'tmadi" value={stats.failed} icon={RotateCcw} />
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load()} />
      ) : !items.length ? (
        <EmptyState
          icon={Award}
          title="Natija yo'q"
          description="Dars testini topshirgandan keyin urinishlar shu yerda chiqadi."
        />
      ) : (
        <>
          <div className="mb-6 overflow-hidden rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-[#0C2340]">Natijalar dinamikasi</h3>
              <p className="text-xs text-[#94A3B8]">
                Manba: {source === "api" ? "Server" : "Mahalliy tarix"} · O&apos;tdi: {stats.success} ·
                O&apos;tmadi: {stats.failed}
              </p>
            </div>
            <div className="mt-4 flex h-40 items-end gap-3 overflow-x-auto">
              {chartItems.map((r) => {
                const pct = r.percentage ?? r.score ?? 0;
                return (
                  <div key={r.id} className="flex min-w-[28px] flex-1 flex-col items-center gap-2">
                    <div
                      className={r.passed ? "w-full rounded-t-lg bg-[#2563EB]/80" : "w-full rounded-t-lg bg-red-300"}
                      style={{ height: `${Math.max(8, pct)}%`, maxHeight: "120px" }}
                    />
                    <span className="text-xs text-[#64748B]">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {groups.map((group) => {
              const head = group.latest;
              return (
                <article
                  key={head.id}
                  className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)]"
                >
                  <h3 className="min-w-0 break-words text-sm font-semibold text-[#0C2340]">
                    {head.testTitle || head.lessonTitle || `Dars #${head.lessonId}`}
                  </h3>
                  <p className="mt-1 break-words text-xs text-[#64748B]">
                    {[head.courseTitle, head.moduleTitle, head.lessonTitle].filter(Boolean).join(" · ")}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {group.attempts.map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F7F9FC] px-3 py-2">
                        <span className="text-sm text-[#334155]">
                          {r.attempt != null ? `${r.attempt}-urinish` : "Urinish"}
                          <span className="ml-2 font-semibold">
                            {r.percentage != null || r.score != null ? `${r.percentage ?? r.score}%` : "—"}
                          </span>
                        </span>
                        <DashboardBadge variant={r.passed ? "success" : "danger"}>
                          {r.passed ? "O'tdi" : "O'tmadi"}
                        </DashboardBadge>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-[#94A3B8]">{formatDate(head.date)}</p>
                  <button
                    type="button"
                    onClick={() => setSelectedId(head.id)}
                    className="mt-3 min-h-11 w-full rounded-xl border border-[#E8EDF5] text-sm font-medium text-[#2563EB]"
                  >
                    Ko&apos;rish
                  </button>
                </article>
              );
            })}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-[0_2px_12px_rgba(15,35,64,0.04)] md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Yo&apos;nalish / Kurs</th>
                    <th className="px-4 py-3">Modul</th>
                    <th className="px-4 py-3">Dars</th>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Urinish</th>
                    <th className="px-4 py-3">Ball</th>
                    <th className="px-4 py-3">Foiz</th>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3">{r.courseTitle || "—"}</td>
                      <td className="px-4 py-3">{r.moduleTitle || "—"}</td>
                      <td className="px-4 py-3">{r.lessonTitle || `Dars #${r.lessonId}`}</td>
                      <td className="px-4 py-3">{r.testTitle || `Test #${r.testId}`}</td>
                      <td className="px-4 py-3">
                        {r.attempt != null ? `${r.attempt}-urinish` : "—"}
                      </td>
                      <td className="px-4 py-3">{r.score != null ? r.score : "—"}</td>
                      <td className="px-4 py-3">
                        {r.percentage != null || r.score != null
                          ? `${r.percentage ?? r.score}%`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">{formatDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <DashboardBadge variant={r.passed ? "success" : "danger"}>
                          {r.passed ? "O'tdi" : "O'tmadi"}
                        </DashboardBadge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(r.id)}
                          className="min-h-11 rounded-xl px-3 text-[#2563EB] hover:underline"
                        >
                          Ko&apos;rish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <DashboardModal open={!!selected} onClose={() => setSelectedId(null)} title="Natija tafsilotlari">
        {selected && (
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <strong>Kurs:</strong> {selected.courseTitle || "—"}
            </p>
            <p>
              <strong>Modul:</strong> {selected.moduleTitle || "—"}
            </p>
            <p>
              <strong>Dars:</strong> {selected.lessonTitle || selected.lessonId}
            </p>
            <p>
              <strong>Test:</strong> {selected.testTitle || selected.testId}
            </p>
            <p>
              <strong>Urinish:</strong>{" "}
              {selected.attempt != null ? `${selected.attempt}-urinish` : "—"}
            </p>
            <p>
              <strong>Foiz:</strong>{" "}
              {selected.percentage != null || selected.score != null
                ? `${selected.percentage ?? selected.score}%`
                : "—"}
            </p>
            <p>
              <strong>Ball:</strong> {selected.score != null ? selected.score : "—"}
            </p>
            <p>
              <strong>Natija:</strong> {selected.passed ? "O'tdi" : "O'tmadi"}
            </p>
            <p>
              <strong>Sana:</strong> {formatDate(selected.date)}
            </p>
          </div>
        )}
      </DashboardModal>
    </div>
  );
}
