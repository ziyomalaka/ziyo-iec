import { apiRequest } from "@/lib/api/client";
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

export async function getManagementClients(params: { page?: number; per_page?: number; q?: string } = {}) {
  const data = await apiRequest<unknown>(
    `/admin/management/clients${toQuery({
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      q: params.q ?? "",
    })}`
  );
  return asPaged<ClientListItem>(data);
}

export async function getManagementClient(id: number) {
  const data = await apiRequest<unknown>(`/admin/management/clients/${id}`);
  return unwrapApiPayload<ClientDetail>(data);
}

export async function getManagementReports() {
  const data = await apiRequest<unknown>("/admin/management/reports");
  return unwrapApiPayload<ManagementReports>(data);
}

export type { PagedResponse };
