"use client";

import { useCallback, useEffect, useState } from "react";
import { getStudentLibrary } from "@/lib/api/library-student";
import type { LibraryItem, LibraryListQuery } from "@/lib/api/types/library";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";

export type LibraryFilters = {
  category: string;
  language: string;
  file_type: string;
  sort: string;
};

export const emptyLibraryFilters: LibraryFilters = {
  category: "",
  language: "",
  file_type: "",
  sort: "newest",
};

export function useStudentLibrary(
  search: string,
  filters: LibraryFilters,
  page: number,
  perPage = 12
) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(search);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search), 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    async (silent = false) => {
      const params: LibraryListQuery = {
        search: query,
        category: filters.category || undefined,
        language: filters.language || undefined,
        file_type: filters.file_type || undefined,
        sort: filters.sort || "newest",
        page,
        per_page: perPage,
      };
      if (!silent) {
        setLoading(true);
        setError(null);
      }
      try {
        const data = await getStudentLibrary(params);
        setItems(data.items);
        setTotal(data.total);
        setTotalPages(Math.max(1, data.total_pages ?? 1));
        setError(null);
      } catch (err) {
        if (silent) return;
        setItems([]);
        setTotal(0);
        setError(studentApiErrorMessage(err, "generic"));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [query, filters, page, perPage]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  return { items, total, totalPages, loading, error, reload: () => void load(false) };
}
