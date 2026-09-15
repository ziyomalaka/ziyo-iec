import { normalizeProgramType } from "@/lib/auth/program";
import type { ClientApplication, ClientListItem } from "@/lib/api/types/admin";
import { clientDasturLabel, clientRetrainingLabel } from "@/lib/admin/client-program";
import { normalizeRetrainingType } from "@/lib/retraining/kind";

export function clientFullName(client: Pick<ClientListItem, "full_name" | "first_name" | "last_name" | "father_name" | "id">) {
  const name = (
    client.full_name ||
    [client.last_name, client.first_name, client.father_name].filter(Boolean).join(" ")
  ).trim();
  return name || `Mijoz #${client.id}`;
}

export function clientProgramTitle(client: Pick<ClientListItem, "program_type" | "retraining_type" | "dastur" | "program_label">) {
  const program = normalizeProgramType(client.program_type);
  if (program === "MALAKA_OSHIRISH") return "Malaka oshirish";
  if (program === "QAYTA_TAYYORLASH") return "Qayta tayyorlash";
  const fromDastur = clientDasturLabel(client);
  if (fromDastur !== "—") {
    if (fromDastur.includes("qayta")) return "Qayta tayyorlash";
    if (fromDastur.includes("Malaka")) return "Malaka oshirish";
  }
  return fromDastur;
}

export function clientSubtypeTitle(client: Pick<ClientListItem, "program_type" | "retraining_type">) {
  const type = normalizeRetrainingType(client.retraining_type);
  if (type === "UMUMIY") return "Umumiy qayta tayyorlash";
  if (type === "PEDAGOGIK") return "Pedagogik qayta tayyorlash";
  if (type === "KASBIY") return "Kasbiy qayta tayyorlash";
  return "";
}

export function clientSourceBadge(client: Pick<ClientListItem, "program_type" | "retraining_type" | "dastur" | "program_label">) {
  return clientSubtypeTitle(client) || clientProgramTitle(client);
}

export function clientDirectionLabel(
  client: { field_of_study?: string | null; subject?: string | null },
  apps: ClientApplication[] = []
) {
  const fromProfile = (client.field_of_study ?? client.subject ?? "").trim();
  if (fromProfile) return fromProfile;
  const titled = apps.map((item) => item.title?.trim()).find(Boolean);
  return titled || "—";
}

export function clientRetrainingShort(client: Pick<ClientListItem, "program_type" | "retraining_type">) {
  return clientRetrainingLabel(client.retraining_type, client.program_type);
}

export function assignedSupervisorLabel(client: Pick<ClientListItem, "supervisor_name" | "supervisor_id">) {
  const name = (client.supervisor_name ?? "").trim();
  if (name) return name;
  return "—";
}

export function pickAssignedSupervisor(data: unknown): { supervisor_id: number | null; supervisor_name: string | null } {
  if (!data || typeof data !== "object") {
    return { supervisor_id: null, supervisor_name: null };
  }
  const row = data as Record<string, unknown>;
  const nested =
    row.supervisor && typeof row.supervisor === "object" && !Array.isArray(row.supervisor)
      ? (row.supervisor as Record<string, unknown>)
      : row.assigned_supervisor && typeof row.assigned_supervisor === "object" && !Array.isArray(row.assigned_supervisor)
        ? (row.assigned_supervisor as Record<string, unknown>)
        : {};
  const idRaw = row.supervisor_id ?? row.assigned_supervisor_id ?? nested.id;
  const id = typeof idRaw === "number" && Number.isInteger(idRaw) && idRaw > 0 ? idRaw : Number(idRaw);
  const nameCandidates = [row.supervisor_name, row.assigned_supervisor_name, nested.full_name, nested.fullName, nested.name];
  const name = nameCandidates.find((value): value is string => typeof value === "string" && Boolean(value.trim()));
  return {
    supervisor_id: Number.isInteger(id) && id > 0 ? id : null,
    supervisor_name: name?.trim() || null,
  };
}
