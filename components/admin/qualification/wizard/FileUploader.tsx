"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { formatBytes, MAX_FILE_SIZE } from "@/lib/qualification/constants";

export type FileUploaderProps = {
  maxSize?: number;
  value?: File | null;
  fileName?: string;
  fileSize?: number;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
  accept?: string;
  hint?: string;
};

export default function FileUploader({
  maxSize = MAX_FILE_SIZE,
  value,
  fileName,
  fileSize,
  onChange,
  disabled,
  label = "Fayl",
  accept,
  hint,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const shownName = value?.name || fileName;
  const shownSize = value?.size ?? fileSize;

  const pick = (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }
    if (file.size <= 0) {
      toast.error("Fayl bo'sh");
      return;
    }
    if (file.size > maxSize) {
      toast.error(`Fayl hajmi ${formatBytes(maxSize)} dan oshmasin`);
      return;
    }
    onChange(file);
  };

  return (
    <div>
      <p className="mb-1 text-sm text-[#0C2340]">{label}</p>
      {shownName ? (
        <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-[#E8EDF5] px-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="break-all text-sm font-medium text-[#0C2340]">{shownName}</p>
            <p className="text-xs text-[#64748B]">
              {shownSize ? formatBytes(shownSize) : ""}
              {value ? " · Tayyor" : " · Qayta tanlang"}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="min-h-11 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs"
            >
              Almashtirish
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              className="min-h-11 rounded-lg border border-[#E8EDF5] px-3 py-1.5 text-xs text-red-600"
            >
              {"O'chirish"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-[5.5rem] w-full flex-col items-center justify-center rounded-lg border border-dashed border-[#E8EDF5] px-3 py-6 text-sm text-[#64748B] hover:bg-[#F7F9FC] disabled:opacity-50"
        >
          <span className="font-semibold text-[#0C2340]">Fayl tanlash</span>
          <span className="mt-1 block text-xs">
            {hint ?? `Har qanday format. Maksimal ${formatBytes(maxSize)}.`}
          </span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        aria-label={label}
        onChange={(event) => pick(event.target.files?.[0] ?? null)}
      />
    </div>
  );
}
