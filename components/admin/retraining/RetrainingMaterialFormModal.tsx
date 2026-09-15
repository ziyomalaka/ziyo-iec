"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import FileUploader from "@/components/admin/qualification/wizard/FileUploader";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import { ApiError, materialUploadErrorMessage } from "@/lib/api/errors";
import { normalizeMaterialType } from "@/lib/retraining/material-types";
import {
  createRetrainingMaterial,
  updateRetrainingMaterial,
  uploadAdminFile,
} from "@/lib/api/retraining-admin";
import RetrainingContentContext, {
  resolveHierarchyContext,
  type RetrainingHierarchyContext,
} from "@/components/admin/retraining/RetrainingContentContext";
import type { QualificationMaterial } from "@/lib/api/types/qualification";
import type { RetrainingPanel } from "@/lib/retraining/admin-panels";
import {
  RETRAINING_PANEL_MATERIAL_TYPES,
  retrainingMaterialFileError,
  retrainingMaterialFileRule,
  retrainingMaterialLabel,
  retrainingMaterialNeedsFile,
  type RetrainingMaterialType,
} from "@/lib/retraining/material-types";

const fieldClass = "mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm";

type RetrainingMaterialFormModalProps = {
  open: boolean;
  panel: RetrainingPanel;
  lessonId: number;
  editing?: QualificationMaterial | null;
  initialType?: RetrainingMaterialType;
  hierarchyContext?: RetrainingHierarchyContext | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

export default function RetrainingMaterialFormModal({
  open,
  panel,
  lessonId,
  editing,
  initialType,
  hierarchyContext,
  onClose,
  onSaved,
}: RetrainingMaterialFormModalProps) {
  const isEdit = Boolean(editing?.id);
  const uploadLock = useRef(false);

  const [type, setType] = useState<RetrainingMaterialType>(initialType ?? "LECTURE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | undefined>();
  const [uploadRetryable, setUploadRetryable] = useState(true);
  const [uploaded, setUploaded] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    uploadLock.current = false;
    const materialType = (editing?.type ?? initialType ?? "LECTURE").toString().toUpperCase() as RetrainingMaterialType;
    setType(materialType);
    setTitle(editing?.title ?? "");
    setDescription("");
    setFile(null);
    setUploadProgress(0);
    setUploadError(undefined);
    setUploadRetryable(true);
    setUploaded(false);
    setSortOrder(0);
  }, [open, editing, initialType, lessonId]);

  const fileRule = retrainingMaterialFileRule(type);
  const needsFile = retrainingMaterialNeedsFile(type);
  const selectableTypes = RETRAINING_PANEL_MATERIAL_TYPES;

  const handleSave = async () => {
    if (uploadLock.current || saving) return;
    if (!title.trim()) {
      toast.error("Material nomi majburiy");
      return;
    }
    const fileError = retrainingMaterialFileError(type, file);
    if (needsFile && !file && !isEdit) {
      toast.error(fileError || "Fayl tanlang");
      return;
    }
    if (file && fileError) {
      toast.error(fileError);
      return;
    }
    if (!isEdit && !hierarchyContext?.direction) {
      toast.error("Yo'nalish tanlanmagan — material paneli aniqlanmaydi");
      return;
    }

    uploadLock.current = true;
    setSaving(true);
    setUploadError(undefined);
    setUploadRetryable(true);

    const normalizedType = normalizeMaterialType(type, "retraining");
    if (!normalizedType) {
      const message = `Material turi noto'g'ri: ${type}`;
      setUploadError(message);
      setUploadRetryable(false);
      toast.error(message);
      uploadLock.current = false;
      setSaving(false);
      return;
    }
    if (process.env.NODE_ENV === "development" && normalizedType !== type) {
      console.log("[RetrainingMaterialFormModal] material type normalized", {
        raw: type,
        normalized: normalizedType,
      });
    }

    try {
      let fileId: number | undefined = editing?.file?.id;

      if (file) {
        setUploadProgress(0);
        const uploadedFile = await uploadAdminFile(file, {
          onProgress: (percent) => setUploadProgress(percent),
        });
        fileId = uploadedFile.id;
        setUploaded(true);
        setUploadProgress(100);
      }

      if (needsFile && !fileId && !isEdit) {
        throw new ApiError(400, "Fayl yuklanmadi");
      }

      if (isEdit && editing?.id) {
        await updateRetrainingMaterial(editing.id, {
          type: normalizedType,
          title: title.trim(),
          description: description.trim() || undefined,
          ...(fileId ? { file_id: fileId } : {}),
        });
        toast.success("Material yangilandi");
      } else {
        await createRetrainingMaterial(
          panel,
          lessonId,
          {
            type: normalizedType,
            title: title.trim(),
            description: description.trim() || undefined,
            file_id: fileId,
            sort_order: sortOrder,
          },
          undefined,
          hierarchyContext?.direction ? { direction: hierarchyContext.direction } : undefined
        );
        toast.success("Material qo'shildi");
      }

      await onSaved();
      onClose();
    } catch (err) {
      const { message, retryable } = materialUploadErrorMessage(err);
      setUploadError(message);
      setUploadRetryable(retryable);
      toast.error(message);
    } finally {
      setSaving(false);
      uploadLock.current = false;
    }
  };

  return (
    <DashboardModal
      open={open}
      onClose={() => {
        if (!saving) onClose();
      }}
      title={isEdit ? "Materialni tahrirlash" : "Material qo'shish"}
      size="md"
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
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {saving ? (file ? "Yuklanmoqda..." : "Saqlanmoqda...") : "Saqlash"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {hierarchyContext ? (
          <RetrainingContentContext
            context={resolveHierarchyContext(
              hierarchyContext.direction,
              hierarchyContext.qualModule,
              hierarchyContext.lesson,
              type
            )}
          />
        ) : null}

        {!isEdit ? (
          <label className="block text-sm">
            Material turi *
            <select
              value={type}
              onChange={(e) => setType(e.target.value as RetrainingMaterialType)}
              disabled={saving || Boolean(initialType)}
              className={fieldClass}
            >
              {selectableTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-[#64748B]">
            Turi: <span className="font-medium text-[#0C2340]">{retrainingMaterialLabel(type)}</span>
          </p>
        )}

        <label className="block text-sm">
          Nomi *
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={saving}
            className={fieldClass}
            placeholder={`Masalan: ${retrainingMaterialLabel(type)} 1`}
          />
        </label>

        <label className="block text-sm">
          Tavsif
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            rows={3}
            className={fieldClass}
          />
        </label>

        <label className="block text-sm">
          Tartib raqami
          <input
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            disabled={saving}
            className={fieldClass}
          />
        </label>

        <FileUploader
          label={isEdit ? "Yangi fayl (ixtiyoriy)" : needsFile ? "Fayl *" : "Fayl (ixtiyoriy)"}
          value={file}
          onChange={setFile}
          disabled={saving}
          accept={fileRule.accept}
          hint={fileRule.hint}
        />

        {uploadProgress > 0 && uploadProgress < 100 ? (
          <div>
            <p className="text-xs text-[#64748B]">Yuklanmoqda... {uploadProgress}%</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
              <div className="h-full bg-[#0756F5]" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        ) : null}

        {uploadError ? (
          <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <span>{uploadError}</span>
            {uploadRetryable ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="font-medium"
              >
                Qayta urinish
              </button>
            ) : null}
          </div>
        ) : null}

        {uploaded ? <p className="text-sm text-emerald-700">Fayl yuklandi</p> : null}
      </div>
    </DashboardModal>
  );
}
