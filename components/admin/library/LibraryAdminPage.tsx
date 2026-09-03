"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import AdminPagination from "@/components/admin/AdminPagination";
import LibraryItemForm from "@/components/admin/library/LibraryItemForm";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import { ApiError } from "@/lib/api/errors";
import {
  deleteAdminLibraryItem,
  getAdminLibrary,
  getAdminLibraryItem,
  setAdminLibraryStatus,
} from "@/lib/api/library";
import type { LibraryItem, LibraryListQuery } from "@/lib/api/types/library";
import { formatDate } from "@/lib/dashboard/utils";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import {
  LIBRARY_CATEGORIES,
  LIBRARY_FILE_TYPES,
  LIBRARY_LANGUAGES,
  LIBRARY_STATUSES,
  libraryCategoryLabel,
  libraryFileTypeLabel,
  libraryLanguageLabel,
} from "@/lib/library/constants";
import { resolveMediaUrl } from "@/lib/api/media";
import { cn } from "@/lib/cn";

const fieldClass = "min-h-11 rounded-lg border border-[#E8EDF5] bg-white px-3 text-sm text-[#0C2340]";

function statusVariant(status?: string) {
  const upper = (status ?? "").toUpperCase();
  if (upper === "PUBLISHED") return "success" as const;
  if (upper === "INACTIVE") return "warning" as const;
  if (upper === "ARCHIVED") return "neutral" as const;
  return "info" as const;
}

export default function LibraryAdminPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("");
  const [fileType, setFileType] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryItem | null>(null);
  const [viewing, setViewing] = useState<LibraryItem | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (silent = false) => {
      const params: LibraryListQuery = {
        search: query,
        category: category || undefined,
        language: language || undefined,
        file_type: fileType || undefined,
        status: status || undefined,
        sort: "newest",
        page,
        per_page: 10,
      };
      if (!silent) setLoading(true);
      try {
        const data = await getAdminLibrary(params);
        setItems(data.items);
        setTotalPages(Math.max(1, data.total_pages ?? 1));
      } catch (error) {
        if (!silent) toast.error(error instanceof ApiError ? error.message : "Ro'yxat yuklanmadi.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [query, category, language, fileType, status, page]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  const onStatus = async (id: number, next: string) => {
    try {
      await setAdminLibraryStatus(id, next);
      toast.success("Holat yangilandi.");
      await load(true);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Holat o'zgarmadi.");
    }
  };

  const onDelete = async (id: number) => {
    if (!window.confirm("Materialni o'chirasizmi? Mijoz kutubxonasidan ham yo'qoladi.")) return;
    try {
      await deleteAdminLibraryItem(id);
      toast.success("Material o'chirildi.");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "O'chirilmadi.");
    }
  };

  const openView = async (id: number) => {
    try {
      setViewing(await getAdminLibraryItem(id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Material ochilmadi.");
    }
  };

  const openEdit = async (row: LibraryItem) => {
    try {
      setEditing(await getAdminLibraryItem(row.id));
      setFormOpen(true);
    } catch {
      setEditing(row);
      setFormOpen(true);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nomi, muallif, tavsif..."
            className="min-h-11 w-full rounded-lg border border-[#E8EDF5] bg-white py-2 pr-3 pl-10 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0756F5] px-4 text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          Yangi material
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          className={fieldClass}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Barcha holatlar</option>
          {LIBRARY_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Barcha kategoriyalar</option>
          {LIBRARY_CATEGORIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Barcha tillar</option>
          {LIBRARY_LANGUAGES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={fileType}
          onChange={(e) => {
            setFileType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Barcha fayl turlari</option>
          {LIBRARY_FILE_TYPES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-[#E8EDF5]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-10 text-center text-sm text-[#64748B]">
          Material topilmadi.
        </p>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-[#E8EDF5] bg-white p-4">
                <p className="break-words font-semibold text-[#0C2340]">{item.title}</p>
                <p className="mt-1 text-sm text-[#64748B]">{item.author}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <DashboardBadge>{libraryCategoryLabel(item.category)}</DashboardBadge>
                  <DashboardBadge variant={statusVariant(item.status)}>{item.status}</DashboardBadge>
                  <DashboardBadge variant="neutral">{libraryFileTypeLabel(item.file_type)}</DashboardBadge>
                </div>
                <p className="mt-2 text-xs text-[#94A3B8]">
                  {libraryLanguageLabel(item.language)} · {item.created_at ? formatDate(item.created_at) : "—"}
                </p>
                <select
                  value={item.status}
                  onChange={(e) => void onStatus(item.id, e.target.value)}
                  className={cn(fieldClass, "mt-3 w-full")}
                >
                  {LIBRARY_STATUSES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button type="button" className="min-h-11 rounded-lg border border-[#E8EDF5] text-sm" onClick={() => void openView(item.id)}>
                    Ko&apos;rish
                  </button>
                  <button type="button" className="min-h-11 rounded-lg border border-[#E8EDF5] text-sm" onClick={() => void openEdit(item)}>
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-red-200 text-sm text-red-600"
                    onClick={() => void onDelete(item.id)}
                  >
                    O&apos;chirish
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-[#E8EDF5] bg-white md:block">
            <table className="min-w-[960px] w-full text-left text-sm">
              <thead className="bg-[#F7F9FC] text-[#64748B]">
                <tr>
                  <th className="px-4 py-3 font-medium">Material</th>
                  <th className="px-4 py-3 font-medium">Muallif</th>
                  <th className="px-4 py-3 font-medium">Kategoriya</th>
                  <th className="px-4 py-3 font-medium">Holat</th>
                  <th className="px-4 py-3 font-medium">Fayl</th>
                  <th className="px-4 py-3 font-medium">Til</th>
                  <th className="px-4 py-3 font-medium">Sana</th>
                  <th className="px-4 py-3 font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[#E8EDF5]">
                    <td className="max-w-[220px] px-4 py-3 font-medium break-words text-[#0C2340]">{item.title}</td>
                    <td className="px-4 py-3 text-[#445574]">{item.author}</td>
                    <td className="px-4 py-3">{libraryCategoryLabel(item.category)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.status}
                        onChange={(e) => void onStatus(item.id, e.target.value)}
                        className="min-h-11 rounded-lg border border-[#E8EDF5] px-2 text-xs"
                      >
                        {LIBRARY_STATUSES.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">{libraryFileTypeLabel(item.file_type)}</td>
                    <td className="px-4 py-3">{libraryLanguageLabel(item.language)}</td>
                    <td className="px-4 py-3 text-[#64748B]">{item.created_at ? formatDate(item.created_at) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="min-h-11 rounded-lg border border-[#E8EDF5] px-3 text-xs" onClick={() => void openView(item.id)}>
                          Ko&apos;rish
                        </button>
                        <button type="button" className="min-h-11 rounded-lg border border-[#E8EDF5] px-3 text-xs" onClick={() => void openEdit(item)}>
                          Tahrirlash
                        </button>
                        <button
                          type="button"
                          className="min-h-11 rounded-lg border border-red-200 px-3 text-xs text-red-600"
                          onClick={() => void onDelete(item.id)}
                        >
                          O&apos;chirish
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />

      <LibraryItemForm
        open={formOpen}
        item={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={() => void load()}
      />

      <DashboardModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.title || "Material"}
        size="lg"
      >
        {viewing ? (
          <div className="space-y-3 text-sm text-[#0C2340]">
            {viewing.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resolveMediaUrl(viewing.cover_url)}
                alt=""
                className="h-48 w-full rounded-lg object-cover"
              />
            ) : null}
            <p>
              <span className="text-[#64748B]">Muallif:</span> {viewing.author}
            </p>
            <p>
              <span className="text-[#64748B]">Kategoriya:</span> {libraryCategoryLabel(viewing.category)}
            </p>
            <p>
              <span className="text-[#64748B]">Holat:</span> {viewing.status}
            </p>
            <p>
              <span className="text-[#64748B]">Til / fayl:</span> {libraryLanguageLabel(viewing.language)} ·{" "}
              {libraryFileTypeLabel(viewing.file_type)}
            </p>
            {viewing.description ? <p className="whitespace-pre-wrap">{viewing.description}</p> : null}
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}
