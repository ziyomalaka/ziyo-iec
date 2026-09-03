/**
 * Mijoz kutubxonasi — faqat public/student endpointlar.
 * Admin /admin/library chaqirilmaydi (403 takrorlanmasin).
 */
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { LibraryItem, LibraryListQuery } from "@/lib/api/types/library";
import { asList, asPaged, unwrapApiPayload, type PagedResponse } from "@/lib/api/unwrap";
import { isPublishedLibraryItem, mapLibraryItem, matchesLibraryQuery } from "@/lib/library/map-item";
import { libraryQueryString } from "@/lib/library/query";

const STUDENT_LIBRARY = "/library";
const LIST_KEYS = ["items", "books", "library", "records", "results", "rows", "list", "data"];

function libraryRows(data: unknown): unknown[] {
  const page = asPaged<unknown>(data);
  if (page.items.length) return page.items;
  const direct = asList(data, LIST_KEYS);
  if (direct.length) return direct;
  const inner = unwrapApiPayload<unknown>(data);
  if (inner && typeof inner === "object") {
    const nested = asList((inner as Record<string, unknown>).data, LIST_KEYS);
    if (nested.length) return nested;
  }
  return [];
}

function mapVisibleItems(rows: unknown[]): LibraryItem[] {
  return rows.map(mapLibraryItem).filter((item): item is LibraryItem => {
    if (!item || item.deleted_at) return false;
    return isPublishedLibraryItem(item);
  });
}

function mapPage(data: unknown): PagedResponse<LibraryItem> {
  const page = asPaged<unknown>(data);
  const rows = page.items.length ? page.items : libraryRows(data);
  const items = mapVisibleItems(rows);
  return {
    ...page,
    items,
    total: page.items.length ? page.total : items.length,
  };
}

function hasEnumFilters(query: LibraryListQuery) {
  return Boolean(query.category || query.language || query.file_type);
}

function sortLibraryItems(items: LibraryItem[], sort?: string) {
  const copy = [...items];
  switch ((sort ?? "newest").trim().toLowerCase()) {
    case "oldest":
      return copy.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, "uz"));
    case "author":
      return copy.sort((a, b) => a.author.localeCompare(b.author, "uz"));
    case "order":
      return copy.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    default:
      return copy.sort((a, b) => String(b.created_at || b.id).localeCompare(String(a.created_at || a.id)));
  }
}

function paginateItems(items: LibraryItem[], query: LibraryListQuery): PagedResponse<LibraryItem> {
  const perPage = query.per_page ?? 12;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
  const safePage = Math.min(Math.max(1, query.page ?? 1), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    total,
    page: safePage,
    per_page: perPage,
    total_pages: totalPages,
  };
}

export async function getStudentLibrary(query: LibraryListQuery = {}) {
  const qs = libraryQueryString({
    ...query,
    status: undefined,
  });
  const data = await apiRequest<unknown>(`${STUDENT_LIBRARY}${qs}`, { cache: "no-store" });
  const page = mapPage(data);
  const matching = page.items.filter((item) => matchesLibraryQuery(item, query));
  const backendLooksWrong =
    hasEnumFilters(query) && (page.items.length === 0 || matching.length !== page.items.length);

  if (!backendLooksWrong) {
    return { ...page, items: matching };
  }

  const fallbackQs = libraryQueryString({
    search: query.search,
    sort: query.sort,
    page: 1,
    per_page: 100,
    status: undefined,
  });
  const allData = await apiRequest<unknown>(`${STUDENT_LIBRARY}${fallbackQs}`, { cache: "no-store" });
  const allItems = sortLibraryItems(
    mapPage(allData).items.filter((item) => matchesLibraryQuery(item, query)),
    query.sort
  );
  return paginateItems(allItems, query);
}

export async function getStudentLibraryItem(id: number) {
  const data = await apiRequest<unknown>(`${STUDENT_LIBRARY}/${id}`, { cache: "no-store" });
  const item = mapLibraryItem(data);
  if (!item || item.deleted_at) {
    throw new ApiError(404, "Material topilmadi.");
  }
  if ((item.status ?? "").trim() && !isPublishedLibraryItem(item)) {
    throw new ApiError(404, "Material topilmadi.");
  }
  return item;
}
