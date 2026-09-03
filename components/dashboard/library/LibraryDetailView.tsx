"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Building2, Calendar, ExternalLink, Globe, Layers, UserRound } from "lucide-react";
import { Link } from "@/i18n/navigation";
import LessonFileViewer from "@/components/dashboard/learning/LessonFileViewer";
import LibraryCoverFallback from "@/components/dashboard/library/LibraryCoverFallback";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import { getStudentLibraryItem } from "@/lib/api/library-student";
import { resolveMediaUrl } from "@/lib/api/media";
import type { LibraryItem } from "@/lib/api/types/library";
import { libraryCategoryLabel, libraryFileTypeLabel, libraryLanguageLabel } from "@/lib/library/constants";
import { libraryCategoryIcon, libraryFileTypeIcon } from "@/lib/library/icons";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

function keywordList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function LibraryDetailView({ id }: { id: string }) {
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reading, setReading] = useState(false);
  const numericId = Number(id);

  const load = async (silent = false) => {
    if (!Number.isInteger(numericId) || numericId <= 0) {
      setError("Ma'lumot topilmadi.");
      setLoading(false);
      return;
    }
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const next = await getStudentLibraryItem(numericId);
      setItem(next);
      setError(null);
    } catch (err) {
      if (silent) return;
      setItem(null);
      setError(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId]);

  useLiveRefresh(() => void load(true));

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-11 w-28 animate-pulse rounded-lg bg-[#E8EDF5]" />
        <div className="aspect-[3/4] max-w-sm animate-pulse rounded-xl bg-[#E8EDF5]" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-[#E8EDF5]" />
        <div className="h-24 animate-pulse rounded bg-[#E8EDF5]" />
      </div>
    );
  }

  if (error || !item) {
    return <ErrorState error={error} onRetry={() => void load(false)} />;
  }

  const cover = item.cover_url ? resolveMediaUrl(item.cover_url) : "";
  const fileSrc = item.file_url ? resolveMediaUrl(item.file_url) : "";
  const keywords = keywordList(item.keywords);
  const canRead = Boolean(fileSrc);
  const officeFallback = item.file_type !== "PDF";

  const CategoryIcon = libraryCategoryIcon(item.category);
  const FileIcon = libraryFileTypeIcon(item.file_type);

  return (
    <div className="min-w-0 overflow-x-hidden">
      <Link
        href="/dashboard/library"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#0756F5]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Kutubxona
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="relative overflow-hidden rounded-xl border border-[#E8EDF5] bg-[#F7F9FC]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <div className="relative aspect-[3/4]">
              <LibraryCoverFallback category={item.category} />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h1 className="break-words text-2xl font-bold text-[#0C2340]">{item.title}</h1>
          <p className="mt-2 flex items-start gap-2 break-words text-[#445574]">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
            {item.author}
          </p>
          <div className="mt-4 space-y-2.5 text-sm text-[#0C2340]">
            <p className="flex items-center gap-2">
              <CategoryIcon className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
              {libraryCategoryLabel(item.category)}
            </p>
            <p className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
              {libraryLanguageLabel(item.language)}
            </p>
            {item.published_year ? (
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
                {item.published_year}
              </p>
            ) : null}
            {item.pages ? (
              <p className="flex items-center gap-2">
                <Layers className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
                {item.pages} sahifa
              </p>
            ) : null}
            {item.publisher ? (
              <p className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
                {item.publisher}
              </p>
            ) : null}
            <p className="flex items-center gap-2">
              <FileIcon className="h-4 w-4 shrink-0 text-[#0756F5]" strokeWidth={1.75} />
              {libraryFileTypeLabel(item.file_type)}
            </p>
          </div>
          {item.description || item.full_description ? (
            <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-[#445574]">
              {item.full_description || item.description}
            </p>
          ) : null}
          {keywords.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {keywords.map((word) => (
                <span key={word} className="rounded-full bg-[#EEF4FF] px-3 py-1 text-xs font-medium text-[#0756F5]">
                  {word}
                </span>
              ))}
            </div>
          ) : null}
          {item.author_about ? (
            <p className="mt-4 text-sm break-words text-[#64748B]">{item.author_about}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={!canRead}
            onClick={() => setReading(true)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0756F5] px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <BookOpen className="h-4 w-4" strokeWidth={2} />
            O&apos;qish
          </button>
          {fileSrc ? (
            <a
              href={fileSrc}
              download
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E8EDF5] px-5 text-sm font-semibold text-[#0756F5]"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              Yuklab olish
            </a>
          ) : null}
          </div>
        </div>
      </div>

      {reading && canRead ? (
        <div className="mt-8">
          <LessonFileViewer src={fileSrc} title={item.title} fileName={item.title} />
          {officeFallback ? (
            <a
              href={fileSrc}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#0756F5]"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
              Yangi oynada ochish / yuklab olish
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
