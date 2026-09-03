import { parsePositiveInt, parseSignedInt, unwrapApiPayload } from "@/lib/api/unwrap";
import { pickFileUrl } from "@/lib/api/media";
import type { LibraryItem } from "@/lib/api/types/library";
import {
  LIBRARY_STATUSES,
  fileTypeFromName,
  normalizeLibraryCategory,
  normalizeLibraryFileType,
  normalizeLibraryLanguage,
  type LibraryCategory,
  type LibraryFileType,
  type LibraryLanguage,
  type LibraryStatus,
} from "@/lib/library/constants";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const next = text(value);
    if (next) return next;
  }
  return "";
}

function keywordsOf(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => text(item)).filter(Boolean).join(", ");
  }
  return text(value);
}

function oneOf<T extends string>(value: string, allowed: readonly T[], fallback: T): T | string {
  const upper = value.trim().toUpperCase();
  return (allowed as readonly string[]).includes(upper) ? (upper as T) : value.trim() || fallback;
}

export function mapLibraryItem(data: unknown): LibraryItem | null {
  const row = asRecord(unwrapApiPayload(data));
  const nestedFile = asRecord(row.file);
  const nestedCover = asRecord(row.cover);
  const id = parsePositiveInt(row.id);
  if (!id) return null;

  const fileUrl = firstText(
    pickFileUrl(row),
    row.file_url,
    nestedFile.file_url,
    nestedFile.url,
    nestedFile.storage_path
  );
  const coverUrl = firstText(
    row.cover_url,
    nestedCover.file_url,
    nestedCover.url,
    nestedCover.storage_path,
    pickFileUrl(nestedCover)
  );

  const language = normalizeLibraryLanguage(firstText(row.language, row.lang)) || "UZ";

  return {
    id,
    title: firstText(row.title, row.name),
    author: firstText(row.author, row.author_name),
    category: (normalizeLibraryCategory(firstText(row.category)) || "BOOK") as LibraryCategory | string,
    description: firstText(row.description, row.short_description),
    full_description: firstText(row.full_description, row.body, row.content),
    language: language as LibraryLanguage | string,
    file_type: (normalizeLibraryFileType(
      firstText(row.file_type, row.material_type, row.type, nestedFile.file_type)
    ) ||
      fileTypeFromName(firstText(fileUrl, nestedFile.original_name, row.file_name, row.filename)) ||
      "PDF") as LibraryFileType | string,
    file_id: parsePositiveInt(row.file_id) ?? parsePositiveInt(nestedFile.id),
    file_url: fileUrl,
    cover_file_id: parsePositiveInt(row.cover_file_id) ?? parsePositiveInt(nestedCover.id),
    cover_url: coverUrl,
    publisher: firstText(row.publisher),
    isbn: firstText(row.isbn),
    published_year: parsePositiveInt(row.published_year) ?? parsePositiveInt(row.year),
    pages: parsePositiveInt(row.pages) ?? parsePositiveInt(row.page_count),
    keywords: keywordsOf(row.keywords ?? row.tags),
    author_about: firstText(row.author_about, row.about_author, row.author_bio),
    status: firstText(row.status)
      ? (oneOf(firstText(row.status), LIBRARY_STATUSES.map((item) => item.value), "DRAFT") as LibraryStatus | string)
      : "",
    order_index: parseSignedInt(row.order_index) ?? parseSignedInt(row.sort_order) ?? 0,
    created_by: parsePositiveInt(row.created_by),
    updated_by: parsePositiveInt(row.updated_by),
    created_at: firstText(row.created_at),
    updated_at: firstText(row.updated_at),
    published_at: firstText(row.published_at) || null,
    deleted_at: firstText(row.deleted_at) || null,
  };
}

export function isPublishedLibraryItem(item: Pick<LibraryItem, "status" | "deleted_at" | "published_at">) {
  if (item.deleted_at) return false;
  const status = (item.status ?? "").trim().toUpperCase();
  if (!status) return true;
  if (status === "DRAFT" || status === "INACTIVE" || status === "ARCHIVED" || status === "DELETED") return false;
  if (status === "PUBLISHED" || status === "OPEN" || status === "ACTIVE" || status === "PUBLIC") return true;
  if (item.published_at) return true;
  return true;
}

export function matchesLibraryQuery(
  item: LibraryItem,
  query: { search?: string; category?: string; language?: string; file_type?: string }
) {
  const search = (query.search ?? "").trim().toLowerCase();
  if (search) {
    const haystack = [item.title, item.author, item.description, item.keywords, item.publisher]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  if (query.category && normalizeLibraryCategory(item.category) !== normalizeLibraryCategory(query.category)) {
    return false;
  }
  if (query.language && normalizeLibraryLanguage(item.language) !== normalizeLibraryLanguage(query.language)) {
    return false;
  }
  if (query.file_type && normalizeLibraryFileType(item.file_type) !== normalizeLibraryFileType(query.file_type)) {
    return false;
  }
  return true;
}
