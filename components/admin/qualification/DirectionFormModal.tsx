"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import { getItCategories } from "@/lib/api/admin-it";
import { ApiError, getApiFieldErrors } from "@/lib/api/errors";
import type { ItCategory } from "@/lib/api/types/admin";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import { classifyEducationLevel, displayEducationCategoryName, educationLevels } from "@/lib/dashboard/education-level";
import { saveAdminDirection, type DirectionWritePayload } from "@/lib/qualification/direction-save";
import { directionCreateSchema } from "@/lib/qualification/schemas";

const fieldClass = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";

function normalizeDirectionStatus(value?: string) {
  const upper = (value || "PUBLISHED").toUpperCase();
  if (upper === "PUBLISHED" || upper === "DRAFT" || upper === "INACTIVE" || upper === "ARCHIVED") return upper;
  if (upper === "OPEN") return "PUBLISHED";
  return "PUBLISHED";
}

function categoryLabel(item: ItCategory) {
  return displayEducationCategoryName(item.title, item.slug) || item.title;
}

function sortCategories(items: ItCategory[]) {
  return [...items].sort((a, b) => {
    const rank = (item: ItCategory) => {
      const level = classifyEducationLevel(item.title, item.slug);
      const index = level ? educationLevels.indexOf(level) : -1;
      return index >= 0 ? index : educationLevels.length;
    };
    return rank(a) - rank(b) || a.id - b.id;
  });
}

type DirectionFormModalProps = {
  open: boolean;
  editing?: QualificationDirection | null;
  saving: boolean;
  setSaving: (value: boolean) => void;
  onClose: () => void;
  onSaved: (direction: QualificationDirection) => Promise<void> | void;
  title?: string;
  save?: (payload: DirectionWritePayload, editing?: QualificationDirection | null) => Promise<QualificationDirection>;
};

export default function DirectionFormModal({
  open,
  editing,
  saving,
  setSaving,
  onClose,
  onSaved,
  title: modalTitle,
  save,
}: DirectionFormModalProps) {
  const [title, setTitle] = useState(editing?.title ?? "");
  const [categoryId, setCategoryId] = useState(editing?.category_id ? String(editing.category_id) : "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [durationHours, setDurationHours] = useState(editing?.duration_hours ? String(editing.duration_hours) : "");
  const [language, setLanguage] = useState(editing?.language || "uz");
  const [status, setStatus] = useState(normalizeDirectionStatus(editing?.status));
  const [categories, setCategories] = useState<ItCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setCategoryId(editing?.category_id ? String(editing.category_id) : "");
    setDescription(editing?.description ?? "");
    setDurationHours(editing?.duration_hours ? String(editing.duration_hours) : "");
    setLanguage(editing?.language || "uz");
    setStatus(normalizeDirectionStatus(editing?.status));
    setFieldErrors({});
    setLoadingCategories(true);
    getItCategories()
      .then((items) => setCategories(sortCategories(items)))
      .catch((error) => toast.error(error instanceof ApiError ? error.message : "Bo'limlar yuklanmadi"))
      .finally(() => setLoadingCategories(false));
  }, [open, editing]);

  const onSubmit = async () => {
    const parsed = directionCreateSchema.safeParse({
      title,
      category_id: Number(categoryId),
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "title");
        if (!next[key]) next[key] = issue.message;
      }
      setFieldErrors(next);
      toast.error(next.category_id || next.title || "Maydonlarni to'ldiring");
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const hours = Number(durationHours);
      const saved = await (save ?? saveAdminDirection)(
        {
          title: parsed.data.title,
          category_id: parsed.data.category_id,
          description: description.trim() || undefined,
          duration_hours: Number.isFinite(hours) && hours > 0 ? hours : undefined,
          language,
          status,
        },
        editing
      );
      const selected = categories.find((item) => item.id === parsed.data.category_id);
      toast.success(editing ? "Yo'nalish yangilandi" : "Yo'nalish yaratildi");
      await onSaved({
        ...saved,
        category_id: saved.category_id ?? parsed.data.category_id,
        category_name: saved.category_name || (selected ? categoryLabel(selected) : undefined),
      });
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      toast.error(error instanceof ApiError ? error.message : "Yo'nalish saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <DashboardModal
      open
      size="md"
      title={modalTitle ?? (editing ? "Yo'nalishni tahrirlash" : "Yangi yo'nalish")}
      onClose={() => {
        if (!saving) onClose();
      }}
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm disabled:opacity-60"
          >
            Bekor
          </button>
          <button
            type="button"
            disabled={saving || loadingCategories}
            onClick={() => void onSubmit()}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <label className="block text-sm">
          Yo'nalish nomi *
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
          {fieldErrors.title ? <p className="mt-1 text-sm text-red-600">{fieldErrors.title}</p> : null}
        </label>
        <label className="block text-sm" htmlFor="direction-category">
          Qaysi bo'lim? *
          <select
            id="direction-category"
            value={categoryId}
            disabled={loadingCategories}
            onChange={(e) => setCategoryId(e.target.value)}
            className={fieldClass}
            aria-invalid={Boolean(fieldErrors.category_id)}
          >
            <option value="">{loadingCategories ? "Yuklanmoqda..." : "Tanlang"}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {categoryLabel(item)}
              </option>
            ))}
          </select>
          {fieldErrors.category_id ? (
            <p className="mt-1 text-sm text-red-600">{fieldErrors.category_id}</p>
          ) : null}
        </label>
        <label className="block text-sm">
          Tavsif
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={fieldClass}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Davomiyligi (soat)
            <input
              type="number"
              min={1}
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block text-sm">
            Til
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className={fieldClass}>
              <option value="uz">O'zbek</option>
              <option value="ru">Rus</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Holati
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldClass}>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="DRAFT">DRAFT</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </label>
      </div>
    </DashboardModal>
  );
}
