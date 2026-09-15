import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import type {
  ClientDetail,
  ClientListItem,
  CreateEmployeeRequest,
  EmployeeResponse,
  ManagementReports,
  StaffRole,
} from "@/lib/api/types/admin";
import type { MessageResponse } from "@/lib/api/types/auth";
import { withPasswordPlain } from "@/lib/auth/password-plain";
import { asList, asPaged, type PagedResponse, unwrapApiPayload } from "@/lib/api/unwrap";
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
import { toQuery } from "@/lib/admin/query";

export async function getEmployees() {
  const data = await apiRequest<unknown>("/admin/management/employees");
  return asList<EmployeeResponse>(data, ["items", "employees"]);
}

export async function createEmployee(payload: CreateEmployeeRequest) {
  const data = await apiRequest<unknown>("/admin/management/employees", {
    method: "POST",
    body: JSON.stringify(withPasswordPlain(payload, payload.password)),
  });
  return unwrapApiPayload<EmployeeResponse>(data);
}

export async function updateEmployeeRole(id: number, role: StaffRole) {
  const data = await apiRequest<unknown>(`/admin/management/employees/${id}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
  return unwrapApiPayload<EmployeeResponse>(data);
}

export async function deleteEmployee(id: number) {
  return apiRequest<MessageResponse>(`/admin/management/employees/${id}`, {
    method: "DELETE",
  });
}

function assertStaffClientsAccess() {
  if (!isStaffRole(getAuthUser()?.role)) {
    throw new ApiError(403, CLIENTS_FORBIDDEN_MESSAGE);
  }
}

function mapManagementClient(item: ClientListItem, raw: unknown = item): ClientListItem {
  const registration = pickClientRegistration(raw);
  const identity = pickClientIdentity(raw);
  const dastur = pickClientDastur(raw);
  const assigned = pickAssignedSupervisor(raw);
  if (item.id) rememberClientRegistration(item.id, registration.program_type, registration.retraining_type);
  return applySavedRegistration({
    ...item,
    middle_name: item.middle_name ?? identity.middle_name,
    phone: item.phone ?? identity.phone,
    phone_number: item.phone_number ?? identity.phone,
    program_type: registration.program_type ?? item.program_type,
    retraining_type: registration.retraining_type ?? item.retraining_type,
    dastur: dastur.dastur ?? item.dastur,
    program_label: dastur.program_label ?? item.program_label,
    supervisor_id: assigned.supervisor_id ?? item.supervisor_id,
    supervisor_name: assigned.supervisor_name ?? item.supervisor_name,
  });
}

export async function getManagementClients(params: {
  page?: number;
  per_page?: number;
  q?: string;
  program_type?: string;
  retraining_type?: string;
} = {}) {
  assertStaffClientsAccess();
  const data = await apiRequest<unknown>(
    `/admin/management/clients${toQuery({
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      q: params.q || undefined,
      program_type: params.program_type,
      retraining_type: params.retraining_type,
    })}`
  );
  const page = asPaged<ClientListItem>(data);
  return {
    ...page,
    items: page.items.map((item) => mapManagementClient(item)),
  };
}

export async function getManagementClientsAll(
  params: { program_type?: string; retraining_type?: string } = {}
) {
  const first = await getManagementClients({ page: 1, per_page: 100, ...params });
  const items = [...first.items];
  const totalPages = Math.min(Math.max(1, first.total_pages || 1), 20);
  for (let page = 2; page <= totalPages; page++) {
    const next = await getManagementClients({ page, per_page: first.per_page || 100, ...params });
    items.push(...next.items);
  }
  return { items, total: first.total || items.length };
}

export async function countManagementClients(params: {
  program_type?: string;
  retraining_type?: string;
} = {}) {
  const page = await getManagementClients({ page: 1, per_page: 1, ...params });
  return page.total;
}

export async function getManagementClient(id: number) {
  assertStaffClientsAccess();
  const data = await apiRequest<unknown>(`/admin/management/clients/${id}`);
  const client = unwrapApiPayload<ClientDetail>(data);
  return mapManagementClient(
    {
      ...client,
      id: client.id ?? id,
    },
    data
  ) as ClientDetail;
}

export async function getManagementReports() {
  const data = await apiRequest<unknown>("/admin/management/reports");
  return unwrapApiPayload<ManagementReports>(data);
}

export type { PagedResponse };
