"use client";

import type { QualificationDirection, QualificationLesson, QualificationModule } from "@/lib/api/types/qualification";
import { formatLessonCode } from "@/lib/qualification/constants";
import { blockLabel, findBlockForModule, type RetrainingBlock } from "@/lib/retraining/content-blocks";
import { retrainingMaterialLabel, type RetrainingMaterialType } from "@/lib/retraining/material-types";

export type RetrainingHierarchyContext = {
  direction: QualificationDirection;
  block?: RetrainingBlock | null;
  qualModule?: QualificationModule | null;
  lesson?: QualificationLesson | null;
  materialType?: RetrainingMaterialType | string | null;
};

type RetrainingContentContextProps = {
  context: RetrainingHierarchyContext;
  compact?: boolean;
};

export function resolveHierarchyContext(
  direction: QualificationDirection,
  qualModule?: QualificationModule | null,
  lesson?: QualificationLesson | null,
  materialType?: RetrainingMaterialType | string | null
): RetrainingHierarchyContext {
  const block = qualModule ? findBlockForModule(direction, qualModule) : null;
  return { direction, block, qualModule, lesson, materialType };
}

export default function RetrainingContentContext({ context, compact }: RetrainingContentContextProps) {
  const { direction, block, qualModule, lesson, materialType } = context;
  const lessonCode =
    lesson?.lesson_code ||
    (qualModule && lesson
      ? formatLessonCode(qualModule.module_number ?? null, lesson.lesson_number ?? null)
      : "");

  const rows: { label: string; value: string }[] = [
    { label: "Yo'nalish", value: direction.title },
  ];
  if (block) rows.push({ label: "Blok", value: blockLabel(block) });
  if (qualModule) rows.push({ label: "Modul", value: qualModule.title });
  if (lesson) rows.push({ label: "Dars", value: `Dars ${lessonCode} — ${lesson.title}` });
  if (materialType) rows.push({ label: "Material", value: retrainingMaterialLabel(String(materialType)) });

  if (compact) {
    return (
      <p className="text-xs text-[#64748B]">
        {rows.map((row) => row.value).join(" → ")}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-[#E8EDF5] bg-[#F7F9FC] px-4 py-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Kontekst</p>
      <ol className="space-y-2">
        {rows.map((row) => (
          <li key={row.label} className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm">
            <span className="font-medium text-[#64748B]">{row.label}:</span>
            <span className="text-[#0C2340]">{row.value}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
