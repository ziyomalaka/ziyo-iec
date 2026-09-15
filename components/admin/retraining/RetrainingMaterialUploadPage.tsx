"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import RetrainingContentContext, {
  resolveHierarchyContext,
} from "@/components/admin/retraining/RetrainingContentContext";
import RetrainingHierarchySelects, {
  type RetrainingHierarchySelection,
} from "@/components/admin/retraining/RetrainingHierarchySelects";
import RetrainingMaterialFormModal from "@/components/admin/retraining/RetrainingMaterialFormModal";
import { ApiError } from "@/lib/api/errors";
import { getRetrainingDirection, getRetrainingDirections } from "@/lib/api/retraining-admin";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import { getRetrainingPanelConfig, type RetrainingPanel } from "@/lib/retraining/admin-panels";
import { RETRAINING_PANEL_MATERIAL_TYPES, type RetrainingMaterialType } from "@/lib/retraining/material-types";

type RetrainingMaterialUploadPageProps = {
  panel: RetrainingPanel;
};

const emptySelection: RetrainingHierarchySelection = {
  directionId: null,
  blockId: null,
  moduleId: null,
  lessonId: null,
};

export default function RetrainingMaterialUploadPage({ panel }: RetrainingMaterialUploadPageProps) {
  const config = getRetrainingPanelConfig(panel);
  const [directions, setDirections] = useState<QualificationDirection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<RetrainingHierarchySelection>(emptySelection);
  const [materialType, setMaterialType] = useState<RetrainingMaterialType | "">("");
  const [formOpen, setFormOpen] = useState(false);

  const loadDirections = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getRetrainingDirections(panel, { per_page: 100 });
      const detailed = await Promise.all(
        rows.map((item) => getRetrainingDirection(panel, item.id, false, { fetchMaterials: false }).catch(() => item))
      );
      setDirections(detailed);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Yo'nalishlar yuklanmadi");
      setDirections([]);
    } finally {
      setLoading(false);
    }
  }, [panel]);

  useEffect(() => {
    void loadDirections();
  }, [loadDirections]);

  const materialOptions = useMemo(
    () => RETRAINING_PANEL_MATERIAL_TYPES.map((item) => ({
      value: item.value,
      label: item.label,
    })),
    []
  );

  const hierarchyContext = useMemo(() => {
    if (!selection.direction || !selection.lesson) return null;
    return resolveHierarchyContext(
      selection.direction,
      selection.qualModule,
      selection.lesson,
      materialType || undefined
    );
  }, [selection, materialType]);

  const canUpload = Boolean(selection.lessonId && materialType);

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
        <span className="mx-2">/</span>
        <span className="text-[#0C2340]">Material yuklash</span>
      </nav>

      <PageHeader
        title="Material yuklash"
        description="Yo'nalish → Blok → Modul → Dars → Material"
      />

      <div className="rounded-xl border border-[#E8EDF5] bg-white p-4">
        <RetrainingHierarchySelects
          directions={directions}
          loading={loading}
          value={selection}
          onChange={(next) => {
            setSelection(next);
            setMaterialType("");
          }}
          showMaterialType
          materialType={materialType}
          onMaterialTypeChange={(value) => setMaterialType(value as RetrainingMaterialType)}
          materialTypeOptions={materialOptions}
        />

        {hierarchyContext ? (
          <div className="mt-4">
            <RetrainingContentContext context={hierarchyContext} />
          </div>
        ) : null}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled={!canUpload}
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Material qo&apos;shish
          </button>
        </div>
      </div>

      {formOpen && selection.lessonId && materialType ? (
        <RetrainingMaterialFormModal
          open
          panel={panel}
          lessonId={selection.lessonId}
          initialType={materialType as RetrainingMaterialType}
          hierarchyContext={hierarchyContext}
          onClose={() => setFormOpen(false)}
          onSaved={async () => {
            setFormOpen(false);
            setMaterialType("");
            await loadDirections();
            toast.success("Material darsga biriktirildi");
          }}
        />
      ) : null}
    </div>
  );
}
