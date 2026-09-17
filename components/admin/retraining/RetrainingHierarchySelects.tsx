"use client";

import { useMemo } from "react";
import type { QualificationDirection, QualificationLesson, QualificationModule } from "@/lib/api/types/qualification";
import { formatLessonCode } from "@/lib/qualification/constants";
import {
  blockLabel,
  buildContentTree,
  type RetrainingBlock,
} from "@/lib/retraining/content-blocks";

const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]";

export type RetrainingHierarchySelection = {
  directionId: number | null;
  blockId: number | null;
  moduleId: number | null;
  lessonId: number | null;
  direction?: QualificationDirection | null;
  block?: RetrainingBlock | null;
  qualModule?: QualificationModule | null;
  lesson?: QualificationLesson | null;
};

type RetrainingHierarchySelectsProps = {
  directions: QualificationDirection[];
  loading?: boolean;
  value: RetrainingHierarchySelection;
  onChange: (next: RetrainingHierarchySelection) => void;
  showMaterialType?: boolean;
  materialType?: string;
  onMaterialTypeChange?: (type: string) => void;
  materialTypeOptions?: { value: string; label: string }[];
};

export default function RetrainingHierarchySelects({
  directions,
  loading,
  value,
  onChange,
  showMaterialType,
  materialType,
  onMaterialTypeChange,
  materialTypeOptions = [],
}: RetrainingHierarchySelectsProps) {
  const direction = useMemo(
    () => directions.find((item) => item.id === value.directionId) ?? null,
    [directions, value.directionId]
  );

  const tree = useMemo(
    () => (direction ? buildContentTree(direction, direction.modules ?? []) : null),
    [direction]
  );

  const blocks = tree?.blocks.map((item) => item.block) ?? [];
  const modules = useMemo(() => {
    if (!tree || !value.blockId) return [];
    return tree.blocks.find((item) => item.block.id === value.blockId)?.modules ?? [];
  }, [tree, value.blockId]);

  const lessons = useMemo(() => {
    if (!value.moduleId) return [];
    return modules.find((item) => item.id === value.moduleId)?.lessons ?? [];
  }, [modules, value.moduleId]);

  const onDirectionChange = (id: number | null) => {
    const picked = directions.find((item) => item.id === id) ?? null;
    onChange({
      directionId: id,
      blockId: null,
      moduleId: null,
      lessonId: null,
      direction: picked,
      block: null,
      qualModule: null,
      lesson: null,
    });
  };

  const onBlockChange = (id: number | null) => {
    const picked = blocks.find((item) => item.id === id) ?? null;
    onChange({
      ...value,
      blockId: id,
      moduleId: null,
      lessonId: null,
      block: picked,
      qualModule: null,
      lesson: null,
    });
  };

  const onModuleChange = (id: number | null) => {
    const picked = modules.find((item) => item.id === id) ?? null;
    onChange({
      ...value,
      moduleId: id,
      lessonId: null,
      qualModule: picked,
      lesson: null,
    });
  };

  const onLessonChange = (id: number | null) => {
    const picked = lessons.find((item) => item.id === id) ?? null;
    onChange({
      ...value,
      lessonId: id,
      lesson: picked ?? null,
    });
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm sm:col-span-2">
        Yo&apos;nalish *
        <select
          value={value.directionId ?? ""}
          disabled={loading}
          onChange={(e) => onDirectionChange(Number(e.target.value) || null)}
          className={fieldClass}
        >
          <option value="">Tanlang</option>
          {directions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Blok *
        <select
          value={value.blockId ?? ""}
          disabled={!value.directionId || loading}
          onChange={(e) => onBlockChange(Number(e.target.value) || null)}
          className={fieldClass}
        >
          <option value="">{value.directionId ? "Tanlang" : "Avval yo'nalishni tanlang"}</option>
          {blocks.map((item) => (
            <option key={item.id} value={item.id}>
              {blockLabel(item)}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm">
        Modul *
        <select
          value={value.moduleId ?? ""}
          disabled={!value.blockId || loading}
          onChange={(e) => onModuleChange(Number(e.target.value) || null)}
          className={fieldClass}
        >
          <option value="">{value.blockId ? "Tanlang" : "Avval blokni tanlang"}</option>
          {modules.map((item) => (
            <option key={item.id} value={item.id}>
              {item.module_number ? `${item.module_number}-modul. ` : ""}
              {item.title}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-sm sm:col-span-2">
        Dars *
        <select
          value={value.lessonId ?? ""}
          disabled={!value.moduleId || loading}
          onChange={(e) => onLessonChange(Number(e.target.value) || null)}
          className={fieldClass}
        >
          <option value="">{value.moduleId ? "Tanlang" : "Avval modulni tanlang"}</option>
          {lessons.map((item) => {
            const code = formatLessonCode(
              value.qualModule?.module_number ?? null,
              item.lesson_number ?? null
            );
            return (
              <option key={item.id} value={item.id}>
                Dars {code || item.lesson_number} — {item.title}
              </option>
            );
          })}
        </select>
      </label>

      {showMaterialType ? (
        <label className="block text-sm sm:col-span-2">
          Material turi *
          <select
            value={materialType ?? ""}
            disabled={!value.lessonId}
            onChange={(e) => onMaterialTypeChange?.(e.target.value)}
            className={fieldClass}
          >
            <option value="">{value.lessonId ? "Tanlang" : "Avval darsni tanlang"}</option>
            {materialTypeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
