"use client";

import { Download, Eye, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LibraryCoverFallback from "@/components/dashboard/library/LibraryCoverFallback";
import { resolveMediaUrl } from "@/lib/api/media";
import type { LibraryItem } from "@/lib/api/types/library";
import { libraryCategoryLabel, libraryFileTypeLabel } from "@/lib/library/constants";
import { libraryCategoryIcon, libraryFileTypeIcon } from "@/lib/library/icons";

type LibraryBookCardProps = {
  item: LibraryItem;
};

export default function LibraryBookCard({ item }: LibraryBookCardProps) {
  const cover = item.cover_url ? resolveMediaUrl(item.cover_url) : "";
  const fileSrc = item.file_url ? resolveMediaUrl(item.file_url) : "";
  const CategoryIcon = libraryCategoryIcon(item.category);
  const FileIcon = libraryFileTypeIcon(item.file_type);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#EEF4FF]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <LibraryCoverFallback category={item.category} />
        )}
        <span className="absolute top-3 right-3 inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-lg bg-white/95 px-2 text-[11px] font-semibold text-[#0756F5] shadow-sm">
          <FileIcon className="h-3.5 w-3.5" strokeWidth={2} />
          {libraryFileTypeLabel(item.file_type)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="break-words text-[17px] leading-[1.35] font-bold text-[#101a37]">{item.title}</h3>
        <p className="mt-2 flex items-start gap-1.5 break-words text-[13px] text-[#445574]">
          <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
          {item.author}
        </p>
        <p className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#0756F5]">
          <CategoryIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
          {libraryCategoryLabel(item.category)}
        </p>
        <div className="mt-auto grid grid-cols-1 gap-2 pt-4">
          <Link
            href={`/dashboard/library/${item.id}`}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0756F5] px-3 text-[13px] font-semibold text-white"
          >
            <Eye className="h-4 w-4" strokeWidth={2} />
            Ko&apos;rish
          </Link>
          {fileSrc ? (
            <a
              href={fileSrc}
              download
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8EDF5] px-3 text-[13px] font-semibold text-[#0756F5]"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Yuklab olish
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
