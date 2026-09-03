"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { getMyApplications } from "@/lib/api/applications";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { applicationDecisionNote } from "@/lib/dashboard/course-application";
import { studentApplicationBadge, studentApplicationLabel } from "@/lib/dashboard/student-status";
import { formatApplicationEvent } from "@/lib/dashboard/utils";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { Link } from "@/i18n/navigation";

function err(error: unknown) {
  return studentApiErrorMessage(error, "generic");
}

export default function ApplicationsView() {
  const [items, setItems] = useState<ClientApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [selected, setSelected] = useState<ClientApplicationResponse | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = await getMyApplications();
      setItems(next);
      setError(null);
      setSelected((prev) => {
        if (!prev) return prev;
        return next.find((item) => item.id === prev.id) ?? prev;
      });
    } catch (caught) {
      if (!silent) setError(caught);
      if (!silent) toast.error(err(caught));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh(() => void load(true));

  return (
    <div className="min-w-0">
      <PageHeader
        title="Arizalarim"
        description="Yo'nalishga yuborilgan arizalar va ularning holati."
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void load(false)} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Ariza yo'q"
          description="Malaka oshirish yo'nalishidan ariza yuboring. Tasdiqlangach dars ochiladi."
          action={
            <Link
              href="/dashboard/courses"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
            >
              Yo'nalishlarni ko'rish
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const note = applicationDecisionNote(item);
            return (
              <article key={item.id} className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-sm font-semibold text-[#0C2340]">{item.title}</h3>
                  <DashboardBadge variant={studentApplicationBadge(item.status)}>
                    {studentApplicationLabel(item.status)}
                  </DashboardBadge>
                </div>
                <p className="mt-2 text-xs text-[#94A3B8]">{formatApplicationEvent(item)}</p>
                {note ? <p className="mt-2 break-words text-sm text-[#445574]">{note}</p> : null}
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="mt-3 min-h-11 w-full rounded-xl border border-[#E8EDF5] text-sm font-medium text-[#0756F5] md:w-auto md:px-4"
                >
                  Ko'rish
                </button>
              </article>
            );
          })}
        </div>
      )}

      <DashboardModal open={!!selected} onClose={() => setSelected(null)} title="Ariza tafsilotlari" size="md">
        {selected ? (
          <div className="space-y-3 text-sm">
            <p>
              <strong>Yo'nalish:</strong> {selected.title}
            </p>
            <p>
              <strong>Holat:</strong> {studentApplicationLabel(selected.status)}
            </p>
            {applicationDecisionNote(selected) ? (
              <p>
                <strong>Izoh:</strong> {applicationDecisionNote(selected)}
              </p>
            ) : null}
            {formatApplicationEvent(selected) !== "—" ? (
              <p>
                <strong>Sana:</strong> {formatApplicationEvent(selected)}
              </p>
            ) : null}
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}
