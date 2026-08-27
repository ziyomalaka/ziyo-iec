"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import StatCard from "@/components/dashboard/ui/StatCard";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import { TrendingUp, ClipboardCheck, CheckCircle, RotateCcw } from "lucide-react";
import { formatDate } from "@/lib/dashboard/utils";
import {
  fetchMyTestResults,
  type StoredTestResultRow,
} from "@/lib/api/learning-progress";

export default function ResultsView() {
  const [items, setItems] = useState<StoredTestResultRow[]>([]);
  const [source, setSource] = useState<"api" | "local">("local");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await fetchMyTestResults();
        if (cancelled) return;
        setItems(res.items);
        setSource(res.source);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = selectedId ? items.find((r) => r.id === selectedId) ?? null : null;

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
    <div>
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
        <p className="text-sm text-[#64748B]">Natijalar yuklanmoqda...</p>
      ) : !items.length ? (
        <div className="rounded-xl border border-[#E8EDF5] bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#64748B]">
            Hali test natijasi yo&apos;q. Dars testini topshirgandan keyin bu yerda ko&apos;rinadi.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-[#0C2340]">Natijalar dinamikasi</h3>
              <p className="text-xs text-[#94A3B8]">
                Manba: {source === "api" ? "Server" : "Mahalliy tarix"} · O&apos;tdi: {stats.success} ·
                O&apos;tmadi: {stats.failed}
              </p>
            </div>
            <div className="mt-4 flex h-40 items-end gap-3">
              {chartItems.map((r) => {
                const pct = r.percentage ?? r.score ?? 0;
                return (
                  <div key={r.id} className="flex flex-1 flex-col items-center gap-2">
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
            {items.map((r) => (
              <article key={r.id} className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words text-sm font-semibold text-[#0C2340]">
                    {r.lessonTitle || `Dars #${r.lessonId}`}
                  </h3>
                  <DashboardBadge variant={r.passed ? "success" : "danger"}>
                    {r.passed ? "O'tdi" : "O'tmadi"}
                  </DashboardBadge>
                </div>
                <p className="mt-1 break-words text-xs text-[#64748B]">{r.courseTitle || "—"}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {r.moduleTitle || "—"} · {r.testTitle || `Test #${r.testId}`}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {r.percentage != null || r.score != null ? `${r.percentage ?? r.score}%` : "—"}
                    {r.attempt != null ? ` · ${r.attempt}-urinish` : ""}
                  </span>
                  <span className="text-xs text-[#94A3B8]">{formatDate(r.date)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className="mt-3 min-h-11 w-full rounded-lg border border-[#E8EDF5] text-sm font-medium text-[#2563EB]"
                >
                  Ko&apos;rish
                </button>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                  <tr>
                    <th className="px-4 py-3">Yo&apos;nalish / Kurs</th>
                    <th className="px-4 py-3">Modul</th>
                    <th className="px-4 py-3">Dars</th>
                    <th className="px-4 py-3">Test</th>
                    <th className="px-4 py-3">Urinish</th>
                    <th className="px-4 py-3">Foiz</th>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    return (
                      <tr key={r.id} className="border-t border-[#E8EDF5]">
                        <td className="px-4 py-3">{r.courseTitle || "—"}</td>
                        <td className="px-4 py-3">{r.moduleTitle || "—"}</td>
                        <td className="px-4 py-3">{r.lessonTitle || `Dars #${r.lessonId}`}</td>
                        <td className="px-4 py-3">{r.testTitle || `Test #${r.testId}`}</td>
                        <td className="px-4 py-3">
                          {r.attempt != null ? `${r.attempt}-urinish` : "—"}
                        </td>
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
                            className="text-[#2563EB] hover:underline"
                          >
                            Ko&apos;rish
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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
