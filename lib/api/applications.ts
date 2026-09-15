import { pickClientDastur, pickClientRegistration } from "@/lib/admin/client-program";
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
  const nestedClient = asRecord(row.client);
  const nestedUser = asRecord(row.user);
  const registration = pickClientRegistration(data);
  const dastur = pickClientDastur(data);
  const retrainingType =
    registration.retraining_type ??
    (typeof row.retraining_type === "string"
      ? row.retraining_type
      : typeof row.retrainingType === "string"
        ? row.retrainingType
        : typeof nestedClient.retraining_type === "string"
          ? nestedClient.retraining_type
          : typeof nestedUser.retraining_type === "string"
            ? nestedUser.retraining_type
            : null);
  const clientName =
    typeof row.client_name === "string"
      ? row.client_name
      : typeof nestedClient.full_name === "string"
        ? nestedClient.full_name
        : typeof nestedUser.full_name === "string"
          ? nestedUser.full_name
          : undefined;
  const clientEmail =
    typeof row.client_email === "string"
      ? row.client_email
      : typeof nestedClient.email === "string"
        ? nestedClient.email
        : typeof nestedUser.email === "string"
          ? nestedUser.email
          : undefined;
  return {
    id: parsePositiveInt(row.id) ?? 0,
    client_id:
      parsePositiveInt(row.client_id) ??
      parsePositiveInt(nestedClient.id) ??
      parsePositiveInt(nestedUser.id) ??
      undefined,
    client_name: clientName,
    client_email: clientEmail,
    title: String(row.title ?? ""),
    type: typeof row.type === "string" ? row.type : undefined,
    program_type:
      registration.program_type ??
      (typeof row.program_type === "string"
        ? row.program_type
        : typeof row.programType === "string"
          ? row.programType
          : typeof nestedClient.program_type === "string"
            ? nestedClient.program_type
            : typeof nestedUser.program_type === "string"
              ? nestedUser.program_type
              : null),
    retraining_type: retrainingType,
    dastur: dastur.dastur,
    program_label: dastur.program_label,
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
