import { apiRequest } from "@/lib/api/client";
import type { ClientApplicationResponse, CreateApplicationRequest } from "@/lib/api/types/applications";
import { asList, parsePositiveInt, unwrapApiPayload } from "@/lib/api/unwrap";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function optionalTime(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function mapApplication(data: unknown): ClientApplicationResponse {
  const row = asRecord(unwrapApiPayload(data));
  return {
    id: parsePositiveInt(row.id) ?? 0,
    client_id: parsePositiveInt(row.client_id) ?? undefined,
    client_name: typeof row.client_name === "string" ? row.client_name : undefined,
    client_email: typeof row.client_email === "string" ? row.client_email : undefined,
    title: String(row.title ?? ""),
    type: typeof row.type === "string" ? row.type : undefined,
    status: String(row.status ?? "").trim().toLowerCase(),
    status_label: typeof row.status_label === "string" ? row.status_label : undefined,
    comment: typeof row.comment === "string" ? row.comment : undefined,
    reject_reason: typeof row.reject_reason === "string" ? row.reject_reason : undefined,
    course_id: parsePositiveInt(row.course_id) ?? undefined,
    created_at: optionalTime(row.created_at),
    updated_at: optionalTime(row.updated_at),
    approved_at: optionalTime(row.approved_at) ?? optionalTime(row.reviewed_at),
  };
}

export async function createApplication(payload: CreateApplicationRequest) {
  const data = await apiRequest<unknown>("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapApplication(data);
}

export async function getMyApplications() {
  const data = await apiRequest<unknown>("/applications");
  return asList<unknown>(data, ["items", "applications"]).map(mapApplication).filter((item) => item.id);
}
