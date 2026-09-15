"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import RetrainingMaterialCard from "@/components/admin/retraining/RetrainingMaterialCard";
import RetrainingMaterialFormModal from "@/components/admin/retraining/RetrainingMaterialFormModal";
import { ApiError } from "@/lib/api/errors";
import {
  deleteRetrainingMaterial,
  getRetrainingDirection,
  getRetrainingLessonMaterials,
  getRetrainingLesson,
  getRetrainingModuleLessonsSafe,
  publishRetrainingLesson,
} from "@/lib/api/retraining-admin";
import type {
  QualificationDirection,
  QualificationLesson,
  QualificationMaterial,
  QualificationModule,
} from "@/lib/api/types/qualification";
import { formatLessonCode, lessonTypeLabel } from "@/lib/qualification/constants";
import { qualificationWizardPath } from "@/lib/qualification/wizard-state";
import RetrainingContentContext, {
  resolveHierarchyContext,
} from "@/components/admin/retraining/RetrainingContentContext";
import {
  findBlockForModule,
  blockLabel,
} from "@/lib/retraining/content-blocks";
import {
  getRetrainingPanelConfig,
  retrainingPanelRoute,
  retrainingStatusLabel,
  type RetrainingPanel,
} from "@/lib/retraining/admin-panels";
import { RETRAINING_PANEL_MATERIAL_TYPES, type RetrainingMaterialType } from "@/lib/retraining/material-types";

type RetrainingLessonDetailPageProps = {
  panel: RetrainingPanel;
  directionId: number;
  moduleId: number;
  lessonId: number;
};

type PageContext = {
  direction: QualificationDirection;
  qualModule: QualificationModule;
  lesson: QualificationLesson;
};

function asLessonType(value?: string) {
  const upper = (value ?? "").toUpperCase();
  return upper === "THEORY" || upper === "PRACTICAL" ? upper : undefined;
}

export default function RetrainingLessonDetailPage({
  panel,
  directionId,
  moduleId,
  lessonId,
}: RetrainingLessonDetailPageProps) {
  const config = getRetrainingPanelConfig(panel);
  const [context, setContext] = useState<PageContext | null>(null);
  const [materials, setMaterials] = useState<QualificationMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [materialsLoading, setMaterialsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [materialForm, setMaterialForm] = useState<{
    editing?: QualificationMaterial | null;
    initialType?: RetrainingMaterialType;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QualificationMaterial | null>(null);
  const deleteMaterialLock = useRef(false);

  const loadMaterials = useCallback(async () => {
    setMaterialsLoading(true);
    try {
      const rows = await getRetrainingLessonMaterials(panel, lessonId, false, {
        direction: context?.direction,
      });
      setMaterials(rows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Materiallar yuklanmadi");
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  }, [panel, lessonId, context]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const direction = await getRetrainingDirection(panel, directionId, false, { fetchMaterials: false });
      let qualModule = (direction.modules ?? []).find((item) => item.id === moduleId);

      if (!qualModule) {
        const modules = direction.modules ?? [];
        qualModule = modules.find((item) => item.id === moduleId);
      }

      if (!qualModule) {
        throw new ApiError(404, "Modul topilmadi");
      }

      let lesson = (qualModule.lessons ?? []).find((item) => item.id === lessonId);
      if (!lesson) {
        lesson = (await getRetrainingLesson(lessonId, false)) ?? undefined;
      }
      if (!lesson) {
        const lessons = await getRetrainingModuleLessonsSafe(panel, moduleId, qualModule.module_number, false, {
          direction,
        });
        lesson = lessons.find((item) => item.id === lessonId);
        qualModule = { ...qualModule, lessons };
      }

      if (!lesson) {
        throw new ApiError(404, "Dars topilmadi");
      }

      setContext({ direction, qualModule, lesson });
    } catch (err) {
      setError(err);
      setContext(null);
    } finally {
      setLoading(false);
    }
  }, [panel, directionId, moduleId, lessonId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  useEffect(() => {
    if (!context) return;
    void loadMaterials();
  }, [context, loadMaterials]);

  const lessonCode = useMemo(() => {
    if (!context) return "";
    const { qualModule, lesson } = context;
    return (
      lesson.lesson_code ||
      formatLessonCode(qualModule.module_number ?? null, lesson.lesson_number ?? null)
    );
  }, [context]);

  const testMaterial = useMemo(
    () => materials.find((item) => (item.type ?? "").toUpperCase() === "TEST"),
    [materials]
  );

  const contentMaterials = useMemo(
    () => materials.filter((item) => (item.type ?? "").toUpperCase() !== "TEST"),
    [materials]
  );

  const handlePublish = async () => {
    if (publishing || !context) return;
    setPublishing(true);
    try {
      await publishRetrainingLesson(panel, lessonId, { direction: context.direction });
      setContext((prev) =>
        prev ? { ...prev, lesson: { ...prev.lesson, status: "PUBLISHED" } } : prev
      );
      setPublishOpen(false);
      toast.success("Dars nashr qilindi");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Nashr qilib bo'lmadi");
    } finally {
      setPublishing(false);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (!deleteTarget?.id || deleteMaterialLock.current || busy) return;
    deleteMaterialLock.current = true;
    setBusy(true);
    if (process.env.NODE_ENV === "development") {
      console.log("Deleting material", {
        materialId: deleteTarget.id,
        lessonId,
        material: deleteTarget,
      });
    }
    try {
      await deleteRetrainingMaterial(deleteTarget.id);
      toast.success("Material o'chirildi");
      setDeleteTarget(null);
      await loadMaterials();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Materialni o'chirib bo'lmadi.");
    } finally {
      setBusy(false);
      deleteMaterialLock.current = false;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <div className="h-6 w-72 animate-pulse rounded bg-[#E8EDF5]" />
        <div className="h-32 animate-pulse rounded-xl bg-[#E8EDF5]" />
      </div>
    );
  }

  if (error || !context) {
    const is404 = error instanceof ApiError && error.status === 404;
    return (
      <div>
        <nav className="mb-3 text-xs text-[#64748B]">
          <Link href="/admin/software/retraining" className="hover:text-[#0756F5]">
            Qayta tayyorlash
          </Link>
          <span className="mx-2">/</span>
          <Link href={config.route} className="hover:text-[#0756F5]">
            {config.shortLabel}
          </Link>
        </nav>
        <ErrorState
          error={error ?? new ApiError(404, "Dars topilmadi")}
          message={is404 ? "Dars topilmadi" : undefined}
          onRetry={() => void loadPage()}
        />
      </div>
    );
  }

  const { direction, qualModule, lesson } = context;
  const block = findBlockForModule(direction, qualModule);
  const lessonKind = asLessonType(typeof lesson.lesson_type === "string" ? lesson.lesson_type : undefined);
  const directionHref = retrainingPanelRoute(panel, directionId);
  const isPublished = (lesson.status ?? "").toUpperCase() === "PUBLISHED";
  const hierarchyContext = resolveHierarchyContext(direction, qualModule, lesson);

  return (
    <div>
      <nav className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#64748B]">
        <Link href="/admin/software/retraining" className="hover:text-[#0756F5]">
          IT Panel
        </Link>
        <span>/</span>
        <Link href="/admin/software/retraining" className="hover:text-[#0756F5]">
          Qayta tayyorlash
        </Link>
        <span>/</span>
        <Link href={config.route} className="hover:text-[#0756F5]">
          {config.shortLabel}
        </Link>
        <span>/</span>
        <Link href={directionHref} className="hover:text-[#0756F5]">
          {direction.title}
        </Link>
        {block ? (
          <>
            <span>/</span>
            <Link href={directionHref} className="hover:text-[#0756F5]">
              {blockLabel(block)}
            </Link>
          </>
        ) : null}
        <span>/</span>
        <Link href={directionHref} className="hover:text-[#0756F5]">
          {qualModule.module_number ? `${qualModule.module_number}-modul` : qualModule.title}
        </Link>
        <span>/</span>
        <span className="text-[#0C2340]">Dars {lessonCode || lesson.lesson_number}</span>
      </nav>

      <PageHeader
        title={`Dars ${lessonCode} — ${lesson.title}`}
        description={
          lessonKind
            ? `${lessonTypeLabel(lessonKind)} · ${config.label}`
            : config.label
        }
        action={
          <div className="flex flex-wrap gap-2">
            {!isPublished ? (
              <button
                type="button"
                disabled={publishing || busy}
                onClick={() => setPublishOpen(true)}
                className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {publishing ? "Nashr qilinmoqda..." : "Darsni nashr qilish"}
              </button>
            ) : (
              <DashboardBadge variant="success">{retrainingStatusLabel(lesson.status)}</DashboardBadge>
            )}
          </div>
        }
      />

      <div className="mb-4">
        <RetrainingContentContext context={hierarchyContext} />
      </div>

      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[#0C2340]">Materiallar</h2>
          <div className="flex flex-wrap gap-2">
            {RETRAINING_PANEL_MATERIAL_TYPES.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={busy}
                onClick={() => setMaterialForm({ initialType: item.value })}
                className="inline-flex min-h-9 items-center rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs font-medium text-[#0756F5] disabled:opacity-50"
              >
                + {item.label}
              </button>
            ))}
          </div>
        </div>

        {materialsLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((key) => (
              <div key={key} className="h-32 animate-pulse rounded-xl bg-[#E8EDF5]" />
            ))}
          </div>
        ) : contentMaterials.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8EDF5] bg-[#F7F9FC] px-4 py-10 text-center">
            <p className="text-sm text-[#64748B]">Hozircha materiallar mavjud emas.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => setMaterialForm({ initialType: "LECTURE" })}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Material qo&apos;shish
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {contentMaterials.map((material) => (
              <RetrainingMaterialCard
                key={material.id}
                material={material}
                disabled={busy}
                onEdit={() => setMaterialForm({ editing: material })}
                onDelete={() => setDeleteTarget(material)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[#E8EDF5] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#0C2340]">Test</h2>
            <p className="text-xs text-[#64748B]">Ixtiyoriy — dars ichida</p>
          </div>
          <Link
            href={qualificationWizardPath({
              step: 4,
              source: "retraining",
              retrainingPanel: panel,
              directionId: direction.id,
              directionTitle: direction.title,
              blockId: block?.id,
              moduleId: qualModule.id,
              moduleNumber: qualModule.module_number,
              moduleTitle: qualModule.title,
              lessonId: lesson.id,
              lessonNumber: lesson.lesson_number,
              lessonType: lessonKind,
              lessonTitle: lesson.title,
              lessonCode,
            })}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs font-medium text-[#0756F5]"
          >
            <Plus className="h-3.5 w-3.5" />
            {testMaterial ? "Testni tahrirlash" : "Test qo'shish"}
          </Link>
        </div>
        {testMaterial ? (
          <p className="text-sm text-[#64748B]">
            Test mavjud: <span className="font-medium text-[#0C2340]">{testMaterial.title || "Test"}</span>
          </p>
        ) : (
          <p className="text-sm text-[#94A3B8]">Test qo&apos;shilmagan.</p>
        )}
      </section>

      {materialForm ? (
        <RetrainingMaterialFormModal
          open
          panel={panel}
          lessonId={lessonId}
          editing={materialForm.editing}
          initialType={materialForm.initialType}
          hierarchyContext={hierarchyContext}
          onClose={() => {
            if (!busy) setMaterialForm(null);
          }}
          onSaved={loadMaterials}
        />
      ) : null}

      {deleteTarget ? (
        <DashboardModal
          open
          size="md"
          title="Materialni o'chirish"
          onClose={() => {
            if (!busy) setDeleteTarget(null);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmDeleteMaterial()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {busy ? "O'chirilmoqda..." : "O'chirish"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#64748B]">
            {deleteTarget.title || "Material"} o&apos;chirilsinmi?
          </p>
        </DashboardModal>
      ) : null}

      {publishOpen ? (
        <DashboardModal
          open
          size="md"
          title="Darsni nashr qilmoqchimisiz?"
          onClose={() => {
            if (!publishing) setPublishOpen(false);
          }}
          footer={
            <>
              <button
                type="button"
                disabled={publishing}
                onClick={() => setPublishOpen(false)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
              >
                Bekor
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => void handlePublish()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {publishing ? "Nashr qilinmoqda..." : "Nashr qilish"}
              </button>
            </>
          }
        >
          <p className="text-sm text-[#64748B]">
            Kamida bitta material bo&apos;lishi kerak. Backend validatsiyasi bajariladi.
          </p>
        </DashboardModal>
      ) : null}
    </div>
  );
}
