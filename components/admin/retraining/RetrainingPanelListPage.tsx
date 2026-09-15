"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import DirectionFormModal from "@/components/admin/qualification/DirectionFormModal";
import AdminPagination from "@/components/admin/AdminPagination";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import { ApiError, FORBIDDEN_ACTION_MESSAGE } from "@/lib/api/errors";
import {
  createRetrainingDirection,
  deleteRetrainingDirection,
  getRetrainingDirections,
  getRetrainingDirectionsPage,
  updateRetrainingDirection,
} from "@/lib/api/retraining-admin";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import type { DirectionWritePayload } from "@/lib/qualification/direction-save";
import { qualificationWizardPath } from "@/lib/qualification/wizard-state";
import {
  getRetrainingPanelConfig,
  retrainingPanelRoute,
  retrainingStatusLabel,
  type RetrainingPanel,
} from "@/lib/retraining/admin-panels";
import { displayEducationCategoryName } from "@/lib/dashboard/education-level";
import { replaceRetrainingPanelSnapshot } from "@/lib/retraining/direction-snapshot";

type RetrainingPanelListPageProps = {
  panel: RetrainingPanel;
};

const PER_PAGE = 10;

function languageLabel(code?: string) {
  if (code === "ru") return "Rus";
  if (code === "uz") return "O'zbek";
  return code ?? "—";
}

export default function RetrainingPanelListPage({ panel }: RetrainingPanelListPageProps) {
  const router = useRouter();
  const config = getRetrainingPanelConfig(panel);

  const [page, setPage] = useState(1);
  const [items, setItems] = useState<QualificationDirection[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [directionForm, setDirectionForm] = useState<QualificationDirection | null | "new">(null);
  const [deleteTarget, setDeleteTarget] = useState<QualificationDirection | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const syncUrl = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams();
      if (nextPage > 1) params.set("page", String(nextPage));
      const qs = params.toString();
      router.replace(`${config.route}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [config.route, router]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlPage = Number(new URLSearchParams(window.location.search).get("page") ?? "1");
    if (Number.isInteger(urlPage) && urlPage > 0) setPage(urlPage);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRetrainingDirectionsPage(panel, {
        page,
        per_page: PER_PAGE,
      });
      setItems(data.items);
      setTotalPages(Math.max(1, data.total_pages));
      setListError(null);
      syncUrl(page);
      if (data.total_pages <= 1) {
        void replaceRetrainingPanelSnapshot(panel, data.items);
      } else {
        void getRetrainingDirections(panel);
      }
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.status === 403
            ? FORBIDDEN_ACTION_MESSAGE
            : error.status === 404
            ? `${error.message} (GET /api/v1/admin/retraining/${panel} — backend endpoint tekshiring)`
            : error.message
          : "Yo'nalishlar yuklanmadi";
      toast.error(message);
      setListError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [panel, page, syncUrl]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const saveDirection = async (payload: DirectionWritePayload, editing?: QualificationDirection | null) => {
    if (editing?.id) return updateRetrainingDirection(panel, editing.id, payload);
    return createRetrainingDirection(panel, payload);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setSaving(true);
    try {
      await deleteRetrainingDirection(panel, deleteTarget.id);
      toast.success("Yo'nalish o'chirildi");
      setDeleteTarget(null);
      await loadList();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "O'chirilmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <nav className="mb-3 text-xs text-[#64748B]">
        <Link href="/admin/software/retraining" className="hover:text-[#0756F5]">
          Qayta tayyorlash
        </Link>
        <span className="mx-2">/</span>
        <span className="text-[#0C2340]">{config.label}</span>
      </nav>

      <PageHeader
        title={config.label}
        description="Yo'nalish → Modul → Dars → Material → Test"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDirectionForm("new")}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              {"Yo'nalish qo'shish"}
            </button>
            <Link
              href={qualificationWizardPath({ source: "retraining", retrainingPanel: panel, step: 1 })}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2 text-sm font-medium text-[#0C2340]"
            >
              <Plus className="h-4 w-4" />
              {"Material qo'shish"}
            </Link>
          </div>
        }
      />

      {loading ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 animate-pulse rounded-xl bg-[#E8EDF5]" />
          ))}
        </div>
      ) : listError ? (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-8 text-center text-sm text-[#B91C1C]">
          {listError}
        </p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E8EDF5] bg-white px-4 py-12 text-center">
          <p className="text-sm text-[#64748B]">Hozircha yo&apos;nalishlar mavjud emas.</p>
          <button
            type="button"
            onClick={() => setDirectionForm("new")}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
          >
            {"Yo'nalish qo'shish"}
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8EDF5] bg-white">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="border-b border-[#E8EDF5] bg-[#F8FAFC] text-xs uppercase text-[#64748B]">
              <tr>
                <th className="px-4 py-3">№</th>
                <th className="px-4 py-3">Yo&apos;nalish nomi</th>
                <th className="px-4 py-3">Kategoriya</th>
                <th className="px-4 py-3">Soat</th>
                <th className="px-4 py-3">Til</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Modullar</th>
                <th className="px-4 py-3">Amallar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b border-[#E8EDF5] last:border-0">
                  <td className="px-4 py-3 text-[#64748B]">{(page - 1) * PER_PAGE + index + 1}</td>
                  <td className="px-4 py-3 font-medium text-[#0C2340]">{item.title}</td>
                  <td className="px-4 py-3">
                    {displayEducationCategoryName(item.category_name ?? "", undefined) || item.category_name || "—"}
                  </td>
                  <td className="px-4 py-3">{item.duration_hours ?? "—"}</td>
                  <td className="px-4 py-3">{languageLabel(item.language)}</td>
                  <td className="px-4 py-3">
                    <DashboardBadge variant={(item.status ?? "").toUpperCase() === "PUBLISHED" ? "success" : "neutral"}>
                      {retrainingStatusLabel(item.status)}
                    </DashboardBadge>
                  </td>
                  <td className="px-4 py-3">{item.module_count ?? item.modules?.length ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link
                        href={retrainingPanelRoute(panel, item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8EDF5] text-[#0756F5]"
                        aria-label="Ko'rish"
                        title="Ko'rish"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setDirectionForm(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8EDF5] text-[#0756F5]"
                        aria-label="Tahrirlash"
                        title="Tahrirlash"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E8EDF5] text-red-600"
                        aria-label="O'chirish"
                        title="O'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />

      <DirectionFormModal
        open={directionForm !== null}
        editing={directionForm === "new" ? null : directionForm}
        saving={saving}
        setSaving={setSaving}
        title={
          directionForm === "new" || !directionForm
            ? `Yangi ${config.shortLabel.toLowerCase()} yo'nalishi`
            : "Yo'nalishni tahrirlash"
        }
        save={saveDirection}
        onClose={() => setDirectionForm(null)}
        onSaved={async (saved) => {
          const wasNew = directionForm === "new";
          setDirectionForm(null);
          if (wasNew && saved.id > 0) {
            router.push(retrainingPanelRoute(panel, saved.id));
            return;
          }
          await loadList();
        }}
      />

      {deleteTarget ? (
        <DashboardModal
          open
          size="md"
          title="O'chirishni tasdiqlang"
          onClose={() => {
            if (!saving) setDeleteTarget(null);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {saving ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#64748B]">
            Ushbu yo&apos;nalishni o&apos;chirishni tasdiqlaysizmi?
            <br />
            <strong className="text-[#0C2340]">{deleteTarget.title}</strong>
          </p>
        </DashboardModal>
      ) : null}
    </div>
  );
}
