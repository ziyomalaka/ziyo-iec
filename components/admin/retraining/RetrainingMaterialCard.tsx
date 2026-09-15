"use client";

import { Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import type { QualificationMaterial } from "@/lib/api/types/qualification";
import {
  retrainingMaterialIcon,
  retrainingMaterialLabel,
} from "@/lib/retraining/material-types";

type RetrainingMaterialCardProps = {
  material: QualificationMaterial;
  onView?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

function materialHref(material: QualificationMaterial) {
  return material.url || material.file_url || material.file?.url;
}

export default function RetrainingMaterialCard({
  material,
  onView,
  onEdit,
  onDelete,
  disabled,
}: RetrainingMaterialCardProps) {
  const type = typeof material.type === "string" ? material.type : "";
  const Icon = retrainingMaterialIcon(type);
  const href = materialHref(material);

  return (
    <article className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F0F5FF] text-[#0756F5]">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
              {retrainingMaterialLabel(type)}
            </p>
            <p className="mt-0.5 truncate text-sm font-medium text-[#0C2340]">
              {material.title || "Material"}
            </p>
            {material.status ? (
              <DashboardBadge variant="neutral" className="mt-2">
                {material.status_label || material.status}
              </DashboardBadge>
            ) : null}
          </div>
        </div>
        <MoreHorizontal className="h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs font-medium text-[#0756F5]"
          >
            <Eye className="h-3.5 w-3.5" />
            Ko&apos;rish
          </a>
        ) : onView ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onView}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs font-medium text-[#0756F5] disabled:opacity-50"
          >
            <Eye className="h-3.5 w-3.5" />
            Ko&apos;rish
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs font-medium text-[#0C2340] disabled:opacity-50"
        >
          <Pencil className="h-3.5 w-3.5" />
          Tahrirlash
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[#FEE2E2] px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          O&apos;chirish
        </button>
      </div>
    </article>
  );
}
