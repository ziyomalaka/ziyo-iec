"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import FileUploader from "@/components/admin/qualification/wizard/FileUploader";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import { ApiError, getApiFieldErrors } from "@/lib/api/errors";
import { resolveMediaUrl } from "@/lib/api/media";
import { createAdminLibraryItem, updateAdminLibraryItem } from "@/lib/api/library";
import type { LibraryItem, LibraryWritePayload } from "@/lib/api/types/library";
import { formatBytes } from "@/lib/qualification/constants";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_COVER_ACCEPT,
  LIBRARY_FILE_TYPES,
  LIBRARY_LANGUAGES,
  LIBRARY_MATERIAL_ACCEPT,
  LIBRARY_MAX_COVER_SIZE,
  LIBRARY_MAX_MATERIAL_SIZE,
  fileTypeFromName,
  isAllowedLibraryCover,
  isAllowedLibraryMaterial,
  isDangerousLibraryFile,
} from "@/lib/library/constants";

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-[#E8EDF5] px-3 text-sm text-[#0C2340]";

type FormState = {
  title: string;
  author: string;
  category: string;
  language: string;
  file_type: string;
  description: string;
  full_description: string;
  publisher: string;
  isbn: string;
  published_year: string;
  pages: string;
  keywords: string;
    author_about: string;
    order_index: string;
  };

function fromItem(item?: LibraryItem | null): FormState {
  return {
    title: item?.title ?? "",
    author: item?.author ?? "",
    category: item?.category || "BOOK",
    language: item?.language || "UZ",
    file_type: item?.file_type || "PDF",
    description: item?.description ?? "",
    full_description: item?.full_description ?? "",
    publisher: item?.publisher ?? "",
    isbn: item?.isbn ?? "",
    published_year: item?.published_year ? String(item.published_year) : "",
    pages: item?.pages ? String(item.pages) : "",
    keywords: item?.keywords ?? "",
    author_about: item?.author_about ?? "",
    order_index: item?.order_index ? String(item.order_index) : "",
  };
}

type LibraryItemFormProps = {
  open: boolean;
  item?: LibraryItem | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function LibraryItemForm({ open, item, onClose, onSaved }: LibraryItemFormProps) {
  const [form, setForm] = useState<FormState>(fromItem(item));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const editing = Boolean(item);

  useEffect(() => {
    if (!open) return;
    setForm(fromItem(item));
    setCoverFile(null);
    setMaterialFile(null);
    setFieldErrors({});
  }, [open, item]);

  const coverPreview = useMemo(() => {
    if (coverFile) return URL.createObjectURL(coverFile);
    return item?.cover_url ? resolveMediaUrl(item.cover_url) : "";
  }, [coverFile, item?.cover_url]);

  useEffect(() => {
    return () => {
      if (coverFile && coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverFile, coverPreview]);

  const patch = (next: Partial<FormState>) => setForm((prev) => ({ ...prev, ...next }));

  const validate = () => {
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Material nomi majburiy";
    if (!form.author.trim()) errors.author = "Muallif majburiy";
    if (!form.category) errors.category = "Kategoriya majburiy";
    if (!form.language) errors.language = "Til majburiy";
    if (!form.file_type) errors.file_type = "Material turi majburiy";
    if (!editing && !materialFile && !item?.file_id && !item?.file_url) errors.file = "Material fayli majburiy";
    if (!editing && !coverFile && !item?.cover_file_id && !item?.cover_url) errors.cover = "Muqova rasmi majburiy";
    return errors;
  };

  const pickCover = (file: File | null) => {
    if (!file) {
      setCoverFile(null);
      return;
    }
    if (isDangerousLibraryFile(file.name) || !isAllowedLibraryCover(file.name)) {
      toast.error("Muqova faqat JPG, JPEG, PNG yoki WEBP bo'lishi kerak.");
      return;
    }
    if (file.size > LIBRARY_MAX_COVER_SIZE) {
      toast.error(`Muqova ${formatBytes(LIBRARY_MAX_COVER_SIZE)} dan oshmasin`);
      return;
    }
    setCoverFile(file);
  };

  const pickMaterial = (file: File | null) => {
    if (!file) {
      setMaterialFile(null);
      return;
    }
    if (isDangerousLibraryFile(file.name) || !isAllowedLibraryMaterial(file.name)) {
      toast.error("Material faqat PDF, DOC, DOCX, PPT yoki PPTX bo'lishi kerak.");
      return;
    }
    if (file.size > LIBRARY_MAX_MATERIAL_SIZE) {
      toast.error(`Fayl ${formatBytes(LIBRARY_MAX_MATERIAL_SIZE)} dan oshmasin`);
      return;
    }
    setMaterialFile(file);
    const detected = fileTypeFromName(file.name);
    if (detected) patch({ file_type: detected });
  };

  const submit = async (status: string) => {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      toast.error("Majburiy maydonlarni to'ldiring.");
      return;
    }

    setSaving(true);
    try {
      const year = form.published_year.trim() ? Number(form.published_year) : null;
      const pages = form.pages.trim() ? Number(form.pages) : null;
      const payload: LibraryWritePayload = {
        title: form.title.trim(),
        author: form.author.trim(),
        category: form.category,
        language: form.language,
        file_type: form.file_type,
        description: form.description.trim(),
        full_description: form.full_description.trim(),
        publisher: form.publisher.trim(),
        isbn: form.isbn.trim(),
        published_year: year && Number.isFinite(year) ? year : null,
        pages: pages && Number.isFinite(pages) ? pages : null,
        keywords: form.keywords.trim(),
        author_about: form.author_about.trim(),
        order_index: form.order_index.trim() ? Number(form.order_index) : 0,
        file: materialFile,
        cover: coverFile,
        status,
      };

      if (item) await updateAdminLibraryItem(item.id, payload);
      else await createAdminLibraryItem(payload);

      toast.success(status === "PUBLISHED" ? "Material nashr qilindi." : "Material saqlandi.");
      onSaved();
      onClose();
    } catch (error) {
      setFieldErrors(getApiFieldErrors(error));
      toast.error(error instanceof ApiError ? error.message : "Saqlanmadi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title={editing ? "Materialni tahrirlash" : "Yangi material"}
      size="xl"
      footer={
        <>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-11 rounded-lg border border-[#E8EDF5] px-4 text-sm"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit("DRAFT")}
            className="min-h-11 rounded-lg border border-[#E8EDF5] px-4 text-sm font-medium"
          >
            DRAFT saqlash
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void submit("PUBLISHED")}
            className="min-h-11 rounded-lg bg-[#0756F5] px-4 text-sm font-medium text-white"
          >
            {saving ? "Saqlanmoqda..." : "PUBLISHED qilish"}
          </button>
        </>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm text-[#0C2340]">
          Material nomi *
          <input className={fieldClass} value={form.title} onChange={(e) => patch({ title: e.target.value })} />
          {fieldErrors.title ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.title}</span> : null}
        </label>
        <label className="block text-sm text-[#0C2340]">
          Muallif *
          <input className={fieldClass} value={form.author} onChange={(e) => patch({ author: e.target.value })} />
          {fieldErrors.author ? <span className="mt-1 block text-xs text-red-600">{fieldErrors.author}</span> : null}
        </label>
        <label className="block text-sm text-[#0C2340]">
          Kategoriya *
          <select className={fieldClass} value={form.category} onChange={(e) => patch({ category: e.target.value })}>
            {LIBRARY_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[#0C2340]">
          Til *
          <select className={fieldClass} value={form.language} onChange={(e) => patch({ language: e.target.value })}>
            {LIBRARY_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[#0C2340]">
          Material turi *
          <select className={fieldClass} value={form.file_type} onChange={(e) => patch({ file_type: e.target.value })}>
            {LIBRARY_FILE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[#0C2340] md:col-span-2">
          Qisqa tavsif
          <textarea
            className="mt-1 min-h-[5.5rem] w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </label>
        <label className="block text-sm text-[#0C2340] md:col-span-2">
          To&apos;liq tavsif
          <textarea
            className="mt-1 min-h-[7rem] w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
            value={form.full_description}
            onChange={(e) => patch({ full_description: e.target.value })}
          />
        </label>
        <label className="block text-sm text-[#0C2340]">
          Nashr yili
          <input
            className={fieldClass}
            inputMode="numeric"
            value={form.published_year}
            onChange={(e) => patch({ published_year: e.target.value })}
          />
        </label>
        <label className="block text-sm text-[#0C2340]">
          Sahifalar soni
          <input
            className={fieldClass}
            inputMode="numeric"
            value={form.pages}
            onChange={(e) => patch({ pages: e.target.value })}
          />
        </label>
        <label className="block text-sm text-[#0C2340]">
          Nashriyot
          <input className={fieldClass} value={form.publisher} onChange={(e) => patch({ publisher: e.target.value })} />
        </label>
        <label className="block text-sm text-[#0C2340]">
          ISBN
          <input className={fieldClass} value={form.isbn} onChange={(e) => patch({ isbn: e.target.value })} />
        </label>
        <label className="block text-sm text-[#0C2340]">
          Kalit so&apos;zlar
          <input
            className={fieldClass}
            value={form.keywords}
            onChange={(e) => patch({ keywords: e.target.value })}
            placeholder="vergul bilan"
          />
        </label>
        <label className="block text-sm text-[#0C2340]">
          Tartib raqami
          <input
            className={fieldClass}
            inputMode="numeric"
            value={form.order_index}
            onChange={(e) => patch({ order_index: e.target.value })}
          />
        </label>
        <label className="block text-sm text-[#0C2340] md:col-span-2">
          Muallif haqida
          <textarea
            className="mt-1 min-h-[5.5rem] w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
            value={form.author_about}
            onChange={(e) => patch({ author_about: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <FileUploader
            label="Muqova rasmi *"
            accept={LIBRARY_COVER_ACCEPT}
            hint={`JPG, JPEG, PNG, WEBP. Maksimal ${formatBytes(LIBRARY_MAX_COVER_SIZE)}.`}
            maxSize={LIBRARY_MAX_COVER_SIZE}
            value={coverFile}
            fileName={item?.cover_url ? "Joriy muqova" : undefined}
            onChange={pickCover}
            disabled={saving}
          />
          {fieldErrors.cover ? <p className="mt-1 text-xs text-red-600">{fieldErrors.cover}</p> : null}
          {coverPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverPreview} alt="" className="mt-3 h-36 w-full rounded-lg border border-[#E8EDF5] object-cover" />
          ) : null}
        </div>
        <div>
          <FileUploader
            label="Material fayli *"
            accept={LIBRARY_MATERIAL_ACCEPT}
            hint={`PDF, DOC, DOCX, PPT, PPTX. Maksimal ${formatBytes(LIBRARY_MAX_MATERIAL_SIZE)}.`}
            maxSize={LIBRARY_MAX_MATERIAL_SIZE}
            value={materialFile}
            fileName={item?.file_url ? "Joriy fayl" : undefined}
            onChange={pickMaterial}
            disabled={saving}
          />
          {fieldErrors.file ? <p className="mt-1 text-xs text-red-600">{fieldErrors.file}</p> : null}
        </div>
      </div>
    </DashboardModal>
  );
}
