import type { LibraryListQuery } from "@/lib/api/types/library";

function wireValue(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

export function libraryQueryString(query: LibraryListQuery = {}, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.category) params.set("category", wireValue(query.category));
  if (query.language) params.set("language", wireValue(query.language));
  if (query.file_type) params.set("file_type", wireValue(query.file_type));
  if (query.status) params.set("status", wireValue(query.status));
  if (query.sort) params.set("sort", wireValue(query.sort));
  if (query.page) params.set("page", String(query.page));
  if (query.per_page) params.set("per_page", String(query.per_page));
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}
