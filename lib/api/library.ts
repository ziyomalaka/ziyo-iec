import { apiRequest, type ApiRequestOptions } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type { LibraryItem, LibraryListQuery, LibraryWritePayload } from "@/lib/api/types/library";
import { asPaged, parsePositiveInt, type PagedResponse } from "@/lib/api/unwrap";
import { uploadAdminFile } from "@/lib/api/qualification";
import { apiUpload, type UploadOptions } from "@/lib/api/upload";
import { getAuthUser } from "@/lib/auth/session";
import { mapLibraryItem } from "@/lib/library/map-item";
import { libraryQueryString } from "@/lib/library/query";

const ADMIN_LIBRARY = "/admin/library";

function adminLibraryOptions(options: ApiRequestOptions = {}): ApiRequestOptions {
  const role = getAuthUser()?.role;
  const headers = new Headers(options.headers);
  if (role) headers.set("X-ZM-Role", role);
  return { ...options, headers };
}

function adminUploadHeaders() {
  const role = getAuthUser()?.role;
  return role ? { "X-ZM-Role": role } : undefined;
}

function wireEnum(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function appendText(form: FormData, key: string, value?: string | number | null) {
  if (value == null) return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return;
    form.append(key, String(value));
    return;
  }
  const text = value.trim();
  if (!text) return;
  form.append(key, text);
}

function libraryFormData(payload: LibraryWritePayload, requireFiles: boolean) {
  if (requireFiles && !(payload.file instanceof File)) {
    throw new ApiError(400, "Material fayli majburiy");
  }
  if (requireFiles && !(payload.cover instanceof File)) {
    throw new ApiError(400, "Muqova rasmi majburiy");
  }

  const form = new FormData();
  form.append("title", payload.title.trim());
  form.append("author", payload.author.trim());
  form.append("category", wireEnum(payload.category));
  form.append("language", wireEnum(payload.language));
  form.append("file_type", wireEnum(payload.file_type));
  appendText(form, "description", payload.description);
  appendText(form, "full_description", payload.full_description);
  appendText(form, "publisher", payload.publisher);
  appendText(form, "isbn", payload.isbn);
  appendText(form, "published_year", payload.published_year);
  appendText(form, "pages", payload.pages);
  appendText(form, "keywords", payload.keywords);
  appendText(form, "author_about", payload.author_about);
  appendText(form, "order_index", payload.order_index ?? null);
  if (payload.file instanceof File) form.append("file", payload.file);
  if (payload.cover instanceof File) form.append("cover", payload.cover);
  return form;
}

async function adminLibraryRequest<T>(suffix: string, options: ApiRequestOptions = {}) {
  return apiRequest<T>(`${ADMIN_LIBRARY}${suffix}`, adminLibraryOptions(options));
}

function mapPage(data: unknown): PagedResponse<LibraryItem> {
  const page = asPaged<unknown>(data);
  return {
    ...page,
    items: page.items.map(mapLibraryItem).filter((item): item is LibraryItem => item != null),
  };
}

function itemFromResponse(data: unknown) {
  return mapLibraryItem(data);
}

async function resolveLibraryItem(data: unknown, fallbackId?: number) {
  const item = itemFromResponse(data);
  if (item) return item;
  const id = parsePositiveInt((data as { id?: unknown })?.id) ?? fallbackId;
  if (id) return getAdminLibraryItem(id);
  throw new ApiError(500, "Material ID qaytmadi");
}

export async function getAdminLibrary(query: LibraryListQuery = {}) {
  const data = await adminLibraryRequest<unknown>(libraryQueryString(query), { cache: "no-store" });
  return mapPage(data);
}

export async function getAdminLibraryItem(id: number) {
  const data = await adminLibraryRequest<unknown>(`/${id}`, { cache: "no-store" });
  const item = mapLibraryItem(data);
  if (!item) throw new ApiError(404, "Material topilmadi.");
  return item;
}

async function applyLibraryStatus(item: LibraryItem, status?: string) {
  const wanted = wireEnum(status);
  if (!wanted || wanted === wireEnum(item.status)) return item;
  return setAdminLibraryStatus(item.id, wanted);
}

export async function createAdminLibraryItem(payload: LibraryWritePayload) {
  const data = await apiUpload<unknown>(ADMIN_LIBRARY, libraryFormData(payload, true), {
    method: "POST",
    headers: adminUploadHeaders(),
  });
  const item = await resolveLibraryItem(data);
  return applyLibraryStatus(item, payload.status);
}

export async function updateAdminLibraryItem(id: number, payload: LibraryWritePayload) {
  const data = await apiUpload<unknown>(`${ADMIN_LIBRARY}/${id}`, libraryFormData(payload, false), {
    method: "PUT",
    headers: adminUploadHeaders(),
  });
  const item = await resolveLibraryItem(data, id);
  return applyLibraryStatus(item, payload.status);
}

export async function setAdminLibraryStatus(id: number, status: string) {
  const data = await adminLibraryRequest<unknown>(`/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: wireEnum(status) }),
  });
  return mapLibraryItem(data) ?? getAdminLibraryItem(id);
}

export async function deleteAdminLibraryItem(id: number) {
  await adminLibraryRequest<unknown>(`/${id}`, { method: "DELETE" });
}

export async function uploadLibraryFile(file: File, options?: UploadOptions) {
  return uploadAdminFile(file, options);
}
