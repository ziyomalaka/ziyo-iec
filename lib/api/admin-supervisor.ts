import { toQuery } from "@/lib/admin/query";
import { mapApplication } from "@/lib/api/applications";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  AccountStatus,
  AppealResponse,
  ClientApplication,
  ClientDetail,
  ClientListItem,
} from "@/lib/api/types/admin";
import { asList, asPaged, parsePositiveInt, unwrapApiPayload, unwrapNamed } from "@/lib/api/unwrap";
import {
  applySavedRegistration,
  CLIENTS_FORBIDDEN_MESSAGE,
  pickClientDastur,
  pickClientIdentity,
  pickClientRegistration,
  rememberClientRegistration,
} from "@/lib/admin/client-program";
import { pickAssignedSupervisor } from "@/lib/admin/client-source";
import { isStaffRole } from "@/lib/auth/roles";
import { getAuthUser } from "@/lib/auth/session";
import { normalizeProgramType } from "@/lib/auth/program";
import { pickPlainPassword, withPasswordPlain } from "@/lib/auth/password-plain";
import { normalizeRetrainingType } from "@/lib/retraining/kind";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function assignDefined(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined || value === null || value === "") continue;
    target[key] = value;
  }
  return target;
}

function flattenClient(data: unknown): Record<string, unknown> {
  const root = asRecord(unwrapNamed(unwrapApiPayload(data), "client"));
  const merged: Record<string, unknown> = {};
  for (const key of ["client", "user", "account", "profile", "item", "data", "attributes", "student"]) {
    const nested = root[key];
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      assignDefined(merged, asRecord(nested));
    }
  }
  return assignDefined({ ...merged }, root);
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

function assertStaffClientsAccess() {
  if (!isStaffRole(getAuthUser()?.role)) {
    throw new ApiError(403, CLIENTS_FORBIDDEN_MESSAGE);
  }
}

function mapClient<T extends ClientListItem>(data: unknown): T {
  const row = flattenClient(data);
  const id = parsePositiveInt(row.id) ?? parsePositiveInt(row.ID) ?? parsePositiveInt(row.client_id);
  const password = pickPlainPassword(data) ?? pickPlainPassword(row);
  const registration = pickClientRegistration(data);
  const identity = pickClientIdentity(data);
  const dastur = pickClientDastur(data);
  const assigned = pickAssignedSupervisor(data);
  const userId = parsePositiveInt(row.user_id) ?? parsePositiveInt(row.userId);
  if (id) rememberClientRegistration(id, registration.program_type, registration.retraining_type);
  const mapped = {
    ...(row as unknown as T),
    ...(id ? { id } : {}),
    password,
    password_plain: password,
    user_id: userId,
    supervisor_id: assigned.supervisor_id,
    supervisor_name: assigned.supervisor_name,
    middle_name: identity.middle_name ?? (typeof row.middle_name === "string" ? row.middle_name : undefined),
    phone: identity.phone ?? (typeof row.phone === "string" ? row.phone : undefined),
    phone_number:
      (typeof row.phone_number === "string" ? row.phone_number : undefined) ?? identity.phone,
    program_type:
      registration.program_type ??
      (typeof row.program_type === "string" ? row.program_type : null),
    retraining_type:
      registration.retraining_type ??
      (typeof row.retraining_type === "string" ? row.retraining_type : null),
    dastur: dastur.dastur ?? (typeof row.dastur === "string" ? row.dastur : null),
    program_label:
      dastur.program_label ?? (typeof row.program_label === "string" ? row.program_label : null),
  };
  return (id ? applySavedRegistration(mapped) : mapped) as T;
}

export async function getSupervisorClients(params: {
  page?: number;
  per_page?: number;
  q?: string;
  status?: AccountStatus | "";
  program_type?: string;
  retraining_type?: string;
} = {}) {
  assertStaffClientsAccess();
  const data = await apiRequest<unknown>(
    `/admin/supervisor/clients${toQuery({
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      q: params.q || undefined,
      status: params.status || undefined,
      program_type: params.program_type,
      retraining_type: params.retraining_type,
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

export async function getSupervisorClientsAll(
  params: { program_type?: string; retraining_type?: string } = {}
) {
  const first = await getSupervisorClients({ page: 1, per_page: 100, ...params });
  const items = [...first.items];
  const totalPages = Math.min(Math.max(1, first.total_pages || 1), 20);
  for (let page = 2; page <= totalPages; page++) {
    const next = await getSupervisorClients({
      page,
      per_page: first.per_page || 100,
      ...params,
    });
    items.push(...next.items);
  }
  return { items, total: first.total || items.length };
}

export async function countSupervisorClients(params: {
  program_type?: string;
  retraining_type?: string;
} = {}) {
  const page = await getSupervisorClients({ page: 1, per_page: 1, ...params });
  return page.total;
}

export async function getSupervisorClient(id: number) {
  assertStaffClientsAccess();
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}`);
  return mapClient<ClientDetail>(data);
}

type ClientKindFields = {
  program_type: string | null;
  retraining_type: string | null;
  dastur: string | null;
  program_label: string | null;
};

function hasClientProgramKind(item: ClientApplication) {
  if (normalizeProgramType(item.program_type) === "MALAKA_OSHIRISH") return true;
  if (normalizeRetrainingType(item.retraining_type)) return true;
  if (item.dastur || item.program_label) return true;
  return false;
}

function kindFromClient(client: Pick<ClientListItem, "program_type" | "retraining_type" | "dastur" | "program_label">): ClientKindFields {
  return {
    program_type: client.program_type ?? null,
    retraining_type: client.retraining_type ?? null,
    dastur: client.dastur ?? null,
    program_label: client.program_label ?? null,
  };
}

async function hydrateApplicationClientKind(items: ClientApplication[]): Promise<ClientApplication[]> {
  const primed = items.map((item) => {
    if (!item.client_id) return item;
    const saved = applySavedRegistration({
      id: item.client_id,
      email: item.client_email,
      full_name: item.client_name,
      program_type: item.program_type,
      retraining_type: item.retraining_type,
      dastur: item.dastur,
      program_label: item.program_label,
    });
    return {
      ...item,
      program_type: item.program_type || saved.program_type,
      retraining_type: item.retraining_type || saved.retraining_type,
      dastur: item.dastur || saved.dastur,
      program_label: item.program_label || saved.program_label,
    };
  });

  const missing = primed.filter((item) => !hasClientProgramKind(item) && (item.client_id || item.client_email));
  if (!missing.length) return primed;

  const byId = new Map<number, ClientKindFields>();
  const byEmail = new Map<string, ClientKindFields>();
  const ids = [...new Set(missing.map((item) => item.client_id).filter((id): id is number => Boolean(id)))];

  await Promise.all(
    ids.map(async (id) => {
      try {
        byId.set(id, kindFromClient(await getSupervisorClient(id)));
      } catch {
        /* mijoz detali yo'q — email orqali qidiramiz */
      }
    })
  );

  const emails = [
    ...new Set(
      missing
        .filter((item) => {
          if (!item.client_email) return false;
          if (item.client_id && byId.has(item.client_id)) return false;
          return true;
        })
        .map((item) => item.client_email!.trim().toLowerCase())
    ),
  ];
  await Promise.all(
    emails.map(async (email) => {
      try {
        const page = await getSupervisorClients({ page: 1, per_page: 5, q: email });
        const client =
          page.items.find((row) => (row.email ?? "").trim().toLowerCase() === email) ?? page.items[0];
        if (client) byEmail.set(email, kindFromClient(client));
      } catch {
        /* qidiruv yo'q */
      }
    })
  );

  return primed.map((item) => {
    const extra =
      (item.client_id ? byId.get(item.client_id) : undefined) ??
      (item.client_email ? byEmail.get(item.client_email.trim().toLowerCase()) : undefined);
    if (!extra) return item;
    return {
      ...item,
      program_type: extra.program_type || item.program_type,
      retraining_type: extra.retraining_type || item.retraining_type,
      dastur: extra.dastur || item.dastur,
      program_label: extra.program_label || item.program_label,
    };
  });
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

function mapAppeal(data: unknown): AppealResponse {
  const row = asRecord(unwrapApiPayload(data));
  const nested = asRecord(row.client);
  const nestedUser = asRecord(row.user);
  const rawId = row.id ?? row.ID ?? row.appeal_id ?? row.appealId;
  const id = parsePositiveInt(rawId) ?? 0;
  return {
    id,
    subject: typeof row.subject === "string" ? row.subject : typeof row.title === "string" ? row.title : undefined,
    message: typeof row.message === "string" ? row.message : typeof row.text === "string" ? row.text : undefined,
    status: typeof row.status === "string" ? row.status : undefined,
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    created_at: typeof row.created_at === "string" ? row.created_at : typeof row.createdAt === "string" ? row.createdAt : undefined,
    client_id:
      parsePositiveInt(row.client_id) ??
      parsePositiveInt(row.user_id) ??
      parsePositiveInt(nested.id) ??
      parsePositiveInt(nestedUser.id),
    client_name:
      (typeof row.client_name === "string" && row.client_name) ||
      (typeof nested.full_name === "string" && nested.full_name) ||
      (typeof nestedUser.full_name === "string" && nestedUser.full_name) ||
      undefined,
    client_email:
      (typeof row.client_email === "string" && row.client_email) ||
      (typeof nested.email === "string" && nested.email) ||
      (typeof nestedUser.email === "string" && nestedUser.email) ||
      undefined,
  };
}

export async function getClientAppeals(id: number) {
  const data = await apiRequest<unknown>(`/admin/supervisor/clients/${id}/appeals`);
  return asList<unknown>(data, ["items", "appeals"]).map(mapAppeal).filter((item) => item.id);
}

export async function getSupervisorAppeals(params: { page?: number; per_page?: number; status?: string } = {}) {
  const data = await apiRequest<unknown>(
    `/admin/supervisor/appeals${toQuery({
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      status: params.status || undefined,
    })}`
  );
  const page = asPaged<unknown>(data);
  const rows = page.items.length
    ? page.items
    : asList(data, ["items", "appeals", "results", "records", "data"]);
  const mapped = rows.map(mapAppeal).filter((item) => item.id || item.subject || item.message);
  return {
    ...page,
    items: mapped.map((item, index) => (item.id ? item : { ...item, id: index + 1 })),
    total: page.total || mapped.length,
  };
}

export async function getSupervisorAppealsAll() {
  try {
    const first = await getSupervisorAppeals({ page: 1, per_page: 100 });
    const items = [...first.items];
    const totalPages = Math.min(Math.max(1, first.total_pages || 1), 20);
    for (let page = 2; page <= totalPages; page++) {
      const next = await getSupervisorAppeals({ page, per_page: first.per_page || 100 });
      items.push(...next.items);
    }
    return items;
  } catch {
    return [];
  }
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
      status: params.status || undefined,
    })}`
  );
  const page = asPaged<unknown>(data);
  return {
    ...page,
    items: await hydrateApplicationClientKind(page.items.map(mapApplication) as ClientApplication[]),
  };
}

export async function decideApplication(
  id: number,
  payload: { status: "processing" | "approved" | "rejected" | "archived"; comment?: string }
) {
  const comment = payload.comment?.trim();
  if (payload.status === "approved") {
    const data = await apiRequest<unknown>(`/admin/supervisor/applications/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify(comment ? { comment } : {}),
    });
    return mapApplication(unwrapApiPayload(data)) as ClientApplication;
  }
  if (payload.status === "rejected") {
    if (!comment) {
      throw new ApiError(400, "Rad etish uchun izoh majburiy");
    }
    const data = await apiRequest<unknown>(`/admin/supervisor/applications/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ comment }),
    });
    return mapApplication(unwrapApiPayload(data)) as ClientApplication;
  }
  const data = await apiRequest<unknown>(`/admin/supervisor/applications/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: payload.status, comment: comment || undefined }),
  });
  return mapApplication(unwrapApiPayload(data)) as ClientApplication;
}
