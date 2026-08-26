"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ClipboardList, CheckCircle, Clock, XCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import StatCard from "@/components/dashboard/ui/StatCard";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { createApplication, getMyApplications } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/errors";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { applicationBadge, applicationStatusLabel, uiLabel } from "@/lib/admin/labels";
import { formatApplicationEvent } from "@/lib/dashboard/utils";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

function err(error: unknown) {
  return error instanceof ApiError ? error.message : "So'rov bajarilmadi";
}

export default function ApplicationsView() {
  const [items, setItems] = useState<ClientApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("Kursga ariza");
  const [comment, setComment] = useState("");
  const [courseId, setCourseId] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<ClientApplicationResponse | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = await getMyApplications();
      setItems(next);
      setSelected((prev) => {
        if (!prev) return prev;
        return next.find((item) => item.id === prev.id) ?? prev;
      });
    } catch (error) {
      if (!silent) toast.error(err(error));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveRefresh(() => void load(true));

  const onCreate = async () => {
    if (!title.trim()) {
      toast.error("Sarlavha majburiy");
      return;
    }
    setSaving(true);
    try {
      await createApplication({
        title: title.trim(),
        type: type.trim() || "Kursga ariza",
        comment: comment.trim() || undefined,
        course_id: Number(courseId) || undefined,
      });
      toast.success("Ariza yuborildi");
      setOpen(false);
      setTitle("");
      setType("Kursga ariza");
      setComment("");
      setCourseId("");
      await load();
    } catch (error) {
      toast.error(err(error));
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    total: items.length,
    pending: items.filter((item) => item.status === "pending" || item.status === "processing").length,
    approved: items.filter((item) => item.status === "approved").length,
    rejected: items.filter((item) => item.status === "rejected").length,
  };

  return (
    <div>
      <PageHeader
        title="Arizalarim"
        description="Kursga ariza yuboring. Katalogdan yuborilganda course_id majburiy."
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
          >
            Yangi ariza
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami" value={stats.total} icon={ClipboardList} />
        <StatCard label="Ko'rib chiqilmoqda" value={stats.pending} icon={Clock} />
        <StatCard label="Tasdiqlangan" value={stats.approved} icon={CheckCircle} />
        <StatCard label="Rad etilgan" value={stats.rejected} icon={XCircle} />
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">№</th>
                  <th className="px-4 py-3 font-medium">Sarlavha</th>
                  <th className="px-4 py-3 font-medium">Turi</th>
                  <th className="px-4 py-3 font-medium">Holati</th>
                  <th className="px-4 py-3 font-medium">Sana</th>
                  <th className="px-4 py-3 font-medium">Amal</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                      Hali ariza yo'q
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#E8EDF5]">
                      <td className="px-4 py-3 font-medium">{item.id}</td>
                      <td className="px-4 py-3">{item.title}</td>
                      <td className="px-4 py-3">{item.type ?? "Kursga ariza"}</td>
                      <td className="px-4 py-3">
                        <DashboardBadge variant={applicationBadge(item.status)}>
                          {item.status_label || uiLabel(item.status, applicationStatusLabel)}
                        </DashboardBadge>
                      </td>
                      <td className="px-4 py-3">{formatApplicationEvent(item)}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => setSelected(item)} className="text-[#2563EB] hover:underline">
                          Ko'rish
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DashboardModal
        open={open}
        onClose={() => setOpen(false)}
        title="Yangi ariza"
        size="md"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm">
              Bekor
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void onCreate()}
              className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Yuborish
            </button>
          </>
        }
      >
        <div className="space-y-4 text-sm">
          <label className="block">
            Sarlavha
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
              placeholder="Matematika kursiga qo'shilish"
            />
          </label>
          <label className="block">
            Turi
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
            />
          </label>
          <label className="block">
            Kurs ID
            <input
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
              placeholder="13"
            />
          </label>
          <label className="block">
            Izoh
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2"
            />
          </label>
        </div>
      </DashboardModal>

      <DashboardModal open={!!selected} onClose={() => setSelected(null)} title="Ariza tafsilotlari" size="md">
        {selected ? (
          <div className="space-y-3 text-sm">
            <p><strong>№:</strong> {selected.id}</p>
            <p><strong>Sarlavha:</strong> {selected.title}</p>
            <p><strong>Turi:</strong> {selected.type ?? "—"}</p>
            <p><strong>Holat:</strong> {selected.status_label || uiLabel(selected.status, applicationStatusLabel)}</p>
            {selected.course_id ? <p><strong>Kurs ID:</strong> {selected.course_id}</p> : null}
            {selected.comment ? <p><strong>Izoh:</strong> {selected.comment}</p> : null}
            {formatApplicationEvent(selected) !== "—" ? (
              <p>
                <strong>{selected.status === "approved" ? "Tasdiqlangan vaqt" : "Sana"}:</strong>{" "}
                {formatApplicationEvent(selected)}
              </p>
            ) : null}
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}
