import { toQuery } from "@/lib/admin/query";
import { mapApplication } from "@/lib/api/applications";
import { apiRequest } from "@/lib/api/client";
import type {
  AccountStatus,
  AppealResponse,
  ClientApplication,
  ClientDetail,
  ClientListItem,
} from "@/lib/api/types/admin";
import { asList, asPaged, parsePositiveInt, unwrapApiPayload, unwrapNamed } from "@/lib/api/unwrap";
import { pickPlainPassword, withPasswordPlain } from "@/lib/auth/password-plain";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function flattenClient(data: unknown): Record<string, unknown> {
  const root = asRecord(unwrapNamed(unwrapApiPayload(data), "client"));
  let merged: Record<string, unknown> = {};
  for (const key of ["client", "user", "account", "profile", "item", "data", "attributes"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      merged = { ...merged, ...asRecord(nested) };
    }
  }
  return { ...merged, ...root };
}

function supervisorClientRows(data: unknown): unknown[] {
  const page = asPaged<unknown>(data);
  if (page.items.length) return page.items;
  const listed = asList(data, ["items", "clients", "data", "users", "results"]);
  if (listed.length) return listed;
  const nested = asRecord(unwrapApiPayload(data)).data;
  if (nested && typeof nested === "object") {
    const nestedPage = asPaged<unknown>(nested);
    if (nestedPage.items.length) return nestedPage.items;
    return asList(nested, ["items", "clients", "users", "results"]);
  }
  return [];
}

function mapClient<T extends ClientListItem>(data: unknown): T {
  const row = flattenClient(data);
  const id = parsePositiveInt(row.id) ?? parsePositiveInt(row.ID) ?? parsePositiveInt(row.client_id);
  const password = pickPlainPassword(data) ?? pickPlainPassword(row);
  return {
    ...(row as unknown as T),
    ...(id ? { id } : {}),
    password,
    password_plain: password,
  };
}

export async function getSupervisorClients(params: {
  page?: number;
  per_page?: number;
  status?: AccountStatus | "";
  q?: string;
} = {}) {
  const data = await apiRequest<unknown>(
    `/admin/supervisor/clients${toQuery({
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      status: params.status ?? "",
      q: params.q ?? "",
    })}`
  );
  const page = asPaged<unknown>(data);
  const rawItems = supervisorClientRows(data);
  return {
    ...page,
    items: rawItems.map((item) => mapClient<ClientListItem>(item)),
    total: page.total || rawItems.length,
  };
}

export async function getSupervisorClient(id: number) {
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}`);
  return mapClient<ClientDetail>(data);
}

export async function updateClientStatus(id: number, status: AccountStatus) {
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
  return mapClient<ClientDetail>(data);
}

/** PUT /admin/supervisor/clients/{id}/password — bo'sh password avtomatik yaratiladi */
export async function updateSupervisorClientPassword(id: number, password?: string) {
  const plain = password?.trim() ?? "";
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}/password`, {
    method: "PUT",
    body: JSON.stringify(withPasswordPlain({ password: plain }, plain)),
  });
  const mapped = mapClient<ClientDetail>(data);
  const passwordValue = mapped.password ?? pickPlainPassword(data) ?? plain;
  return { ...mapped, ...(passwordValue ? { password: passwordValue, password_plain: passwordValue } : {}) };
}

export async function getClientApplications(id: number) {
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}/applications`);
  return asList<unknown>(data, ["items", "applications"]).map(mapApplication) as ClientApplication[];
}

export async function getClientAppeals(id: number) {
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}/appeals`);
  return asList<AppealResponse>(data, ["items", "appeals"]);
}

export async function getClientCourseProgress(id: number) {
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}/course-progress`);
  return asList<Record<string, unknown>>(data, ["items"]);
}

export async function getSupervisorApplications(params: {
  page?: number;
  per_page?: number;
  status?: string;
} = {}) {
  const data = await apiRequest<unknown>(
    `/admin/supervisor/applications${toQuery({
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      status: params.status ?? "pending",
    })}`
  );
  const page = asPaged<unknown>(data);
  return {
    ...page,
    items: page.items.map(mapApplication) as ClientApplication[],
  };
}

export async function decideApplication(
  id: number,
  payload: { status: "processing" | "approved" | "rejected" | "archived"; comment?: string }
) {
  const data = await apiRequest<unknown>(`/admin/supervisor/applications/${id}/status`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return mapApplication(unwrapApiPayload(data)) as ClientApplication;
}
