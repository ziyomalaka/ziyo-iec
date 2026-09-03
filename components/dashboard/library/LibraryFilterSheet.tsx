"use client";

import { useEffect, useState } from "react";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_FILE_TYPES,
  LIBRARY_LANGUAGES,
  LIBRARY_SORTS,
} from "@/lib/library/constants";
import type { LibraryFilters } from "@/lib/hooks/useLibrary";

const fieldClass = "mt-1 min-h-11 w-full rounded-lg border border-[#E8EDF5] px-3 text-sm text-[#0C2340]";

type LibraryFilterSheetProps = {
  open: boolean;
  value: LibraryFilters;
  onClose: () => void;
  onApply: (next: LibraryFilters) => void;
};

export default function LibraryFilterSheet({ open, value, onClose, onApply }: LibraryFilterSheetProps) {
  const [draft, setDraft] = useState<LibraryFilters>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const apply = (next: LibraryFilters) => {
    onApply(next);
    onClose();
  };

  return (
    <DashboardModal
      open={open}
      onClose={onClose}
      title="Filtrlar"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              const cleared = { category: "", language: "", file_type: "", sort: "newest" };
              setDraft(cleared);
              apply(cleared);
            }}
            className="min-h-11 rounded-lg border border-[#E8EDF5] px-4 text-sm"
          >
            Tozalash
          </button>
          <button
            type="button"
            onClick={() => apply(draft)}
            className="min-h-11 rounded-lg bg-[#0756F5] px-4 text-sm font-medium text-white"
          >
            Qo&apos;llash
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <label className="block text-sm text-[#0C2340]">
          Material turi
          <select className={fieldClass} value={draft.file_type} onChange={(e) => setDraft({ ...draft, file_type: e.target.value })}>
            <option value="">Barchasi</option>
            {LIBRARY_FILE_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[#0C2340]">
          Til
          <select className={fieldClass} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })}>
            <option value="">Barchasi</option>
            {LIBRARY_LANGUAGES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[#0C2340]">
          Kategoriya
          <select className={fieldClass} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            <option value="">Barchasi</option>
            {LIBRARY_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-[#0C2340]">
          Saralash
          <select className={fieldClass} value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })}>
            {LIBRARY_SORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </DashboardModal>
  );
}
