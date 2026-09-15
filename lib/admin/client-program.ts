import { normalizeProgramType } from "@/lib/auth/program";
import type { AccountStatus, ClientListItem } from "@/lib/api/types/admin";
import { backendRetrainingTypeFromStudent } from "@/lib/retraining/backend-type";
import { normalizeRetrainingType, type RetrainingType } from "@/lib/retraining/kind";

export type ClientProgramFilter = "MALAKA_OSHIRISH" | "QAYTA_TAYYORLASH";
export type ClientRetrainingFilter = RetrainingType;

export const CLIENTS_FORBIDDEN_MESSAGE = "Ruxsat mavjud emas";

export const CLIENT_PROGRAM_TABS: Array<{ id: ClientProgramFilter; label: string }> = [
  { id: "MALAKA_OSHIRISH", label: "Malaka oshirish" },
  { id: "QAYTA_TAYYORLASH", label: "Qayta tayyorlash" },
];

export const CLIENT_RETRAINING_TABS: Array<{
  id: ClientRetrainingFilter;
  label: string;
  dot: string;
  dotActive: string;
  dotIdle: string;
}> = [
  {
    id: "UMUMIY",
    label: "Umumiy",
    dot: "border-[#22C55E]",
    dotActive: "bg-[#22C55E]",
    dotIdle: "bg-white",
  },
  {
    id: "PEDAGOGIK",
    label: "Pedagogik",
    dot: "border-[#3B82F6]",
    dotActive: "bg-[#3B82F6]",
    dotIdle: "bg-white",
  },
  {
    id: "KASBIY",
    label: "Kasbiy",
    dot: "border-[#A78BFA]",
    dotActive: "bg-[#A78BFA]",
    dotIdle: "bg-white",
  },
];

export function clientProgramLabel(value?: string | null) {
  const type = normalizeProgramType(value);
  if (type === "QAYTA_TAYYORLASH") return "Qayta tayyorlash";
  if (type === "MALAKA_OSHIRISH") return "Malaka oshirish";
  return "—";
}

const DASTUR_LABELS: Record<string, string> = {
  MALAKA: "Malaka oshirish",
  MALAKA_OSHIRISH: "Malaka oshirish",
  MALAKAOSHIRISH: "Malaka oshirish",
  UMUMIY: "Umumiy qayta tayyorlash",
  UMUMIY_QAYTA_TAYYORLASH: "Umumiy qayta tayyorlash",
  PEDAGOGIK: "Pedagogik qayta tayyorlash",
  PEDAGOGIK_QAYTA_TAYYORLASH: "Pedagogik qayta tayyorlash",
  KASBIY: "Kasbiy qayta tayyorlash",
  KASBIY_QAYTA_TAYYORLASH: "Kasbiy qayta tayyorlash",
};

export function mapDasturValue(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const key = raw.toUpperCase().replace(/[\s-]+/g, "_");
  return DASTUR_LABELS[key] ?? (DASTUR_LABELS[key.replace(/_QAYTA_TAYYORLASH$/, "")] ?? raw);
}

export function pickClientDastur(data: unknown): { dastur: string | null; program_label: string | null } {
  const records = collectRecords(data);
  return {
    dastur: firstString(records, ["dastur", "Dastur"]),
    program_label: firstString(records, ["program_label", "programLabel", "ProgramLabel"]),
  };
}

export function clientDasturLabel(
  client: Pick<ClientListItem, "dastur" | "program_label" | "program_type" | "retraining_type">
) {
  const fromApi = mapDasturValue(client.dastur) ?? mapDasturValue(client.program_label);
  if (fromApi) return fromApi;
  const retraining = normalizeRetrainingType(client.retraining_type);
  if (retraining === "UMUMIY") return "Umumiy qayta tayyorlash";
  if (retraining === "PEDAGOGIK") return "Pedagogik qayta tayyorlash";
  if (retraining === "KASBIY") return "Kasbiy qayta tayyorlash";
  if (normalizeProgramType(client.program_type) === "MALAKA_OSHIRISH") return "Malaka oshirish";
  if (normalizeProgramType(client.program_type) === "QAYTA_TAYYORLASH") return "Qayta tayyorlash";
  return "—";
}

export function clientRetrainingLabel(value?: string | null, program?: string | null) {
  const type = normalizeRetrainingType(value);
  if (type === "UMUMIY") return "Umumiy";
  if (type === "PEDAGOGIK") return "Pedagogik";
  if (type === "KASBIY") return "Kasbiy";
  if (normalizeProgramType(program) === "QAYTA_TAYYORLASH") return "Tanlanmagan";
  return "—";
}

function normalizeClientProgramType(value?: string | null) {
  const direct = normalizeProgramType(value);
  if (direct) return direct;
  const key = (value ?? "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!key) return null;
  if (key === "MALAKA" || key === "MALAKAOSHIRISH" || key === "QUALIFICATION") return "MALAKA_OSHIRISH";
  if (key === "QAYTA" || key === "QAYTATAYYORLASH" || key === "RETRAINING") return "QAYTA_TAYYORLASH";
  return null;
}

function asTextCandidate(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  for (const key of ["program_type", "retraining_type", "code", "name", "value", "type", "key", "slug"]) {
    const next = row[key];
    if (typeof next === "string" && next.trim()) return next.trim();
  }
  return null;
}

function firstNormalized<T>(
  records: Record<string, unknown>[],
  keys: string[],
  normalize: (value: string) => T | null
) {
  for (const key of keys) {
    for (const row of records) {
      const text = asTextCandidate(row[key]);
      if (!text) continue;
      const next = normalize(text);
      if (next) return next;
    }
  }
  return null;
}

function collectRecords(data: unknown) {
  const records: Record<string, unknown>[] = [];
  const walk = (value: unknown, depth: number) => {
    if (!value || typeof value !== "object" || depth > 6) return;
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 30)) walk(item, depth + 1);
      return;
    }
    const row = value as Record<string, unknown>;
    records.push(row);
    for (const nested of Object.values(row)) {
      if (nested && typeof nested === "object") walk(nested, depth + 1);
    }
  };
  walk(data, 0);
  return records;
}

function firstString(records: Record<string, unknown>[], keys: string[]) {
  for (const key of keys) {
    for (const row of records) {
      const value = row[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  return null;
}

/** Ro'yxatdan o'tish turini nested user/profile/detail dan o'qiydi. */
export function pickClientRegistration(data: unknown): {
  program_type: string | null;
  retraining_type: string | null;
} {
  const records = collectRecords(data);
  const retraining_type = firstNormalized(
    records,
    [
      "retraining_type",
      "retrainingType",
      "RetrainingType",
      "retraining",
      "retraining_kind",
      "dastur",
      "program_label",
    ],
    normalizeRetrainingType
  );
  const program_type =
    firstNormalized(
      records,
      ["program_type", "programType", "ProgramType", "program", "kind", "student_program", "studentProgram"],
      normalizeClientProgramType
    ) ?? (retraining_type ? "QAYTA_TAYYORLASH" : null);
  return { program_type, retraining_type };
}

export function pickClientIdentity(data: unknown): {
  middle_name?: string;
  phone?: string;
} {
  const records = collectRecords(data);
  return {
    middle_name: firstString(records, ["middle_name", "middleName", "father_name", "fatherName"]) ?? undefined,
    phone: firstString(records, ["phone", "phone_number", "phoneNumber"]) ?? undefined,
  };
}

export function parseClientProgramParam(value?: string | null): ClientProgramFilter {
  return normalizeProgramType(value) ?? "MALAKA_OSHIRISH";
}

export function parseClientRetrainingParam(value?: string | null): ClientRetrainingFilter {
  return normalizeRetrainingType(value) ?? "UMUMIY";
}

/** Tab → backend query. Malaka ga retraining_type qo‘shilmaydi. */
export function clientsListQuery(
  program: ClientProgramFilter,
  retrainingType?: ClientRetrainingFilter | null
): { program_type: string; retraining_type?: string } {
  if (program === "MALAKA_OSHIRISH") {
    return { program_type: "MALAKA_OSHIRISH" };
  }
  const type = normalizeRetrainingType(retrainingType) ?? "UMUMIY";
  return {
    program_type: "QAYTA_TAYYORLASH",
    retraining_type: backendRetrainingTypeFromStudent(type),
  };
}

const REGISTRATION_CACHE_KEY = "ziyo_client_registration_v1";

type SavedRegistration = { program_type: string | null; retraining_type: string | null };

function readRegistrationCache(): Record<string, SavedRegistration> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(REGISTRATION_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, SavedRegistration>) : {};
  } catch {
    return {};
  }
}

/** Har bir mijozning dasturini o'z joyida saqlaydi. */
export function rememberClientRegistration(
  id: number,
  program_type?: string | null,
  retraining_type?: string | null
) {
  if (typeof window === "undefined" || !id) return;
  const all = readRegistrationCache();
  const prev = all[String(id)] ?? { program_type: null, retraining_type: null };
  all[String(id)] = {
    program_type: program_type || prev.program_type,
    retraining_type: retraining_type || prev.retraining_type,
  };
  window.sessionStorage.setItem(REGISTRATION_CACHE_KEY, JSON.stringify(all));
}

export function applySavedRegistration(item: ClientListItem): ClientListItem {
  const saved = readRegistrationCache()[String(item.id)];
  if (!saved) return item;
  return {
    ...item,
    program_type: item.program_type || saved.program_type,
    retraining_type: item.retraining_type || saved.retraining_type,
  };
}

export async function hydrateClientRegistrations(
  items: ClientListItem[],
  loadDetail: (id: number) => Promise<Partial<ClientListItem>>
) {
  const primed = items.map(applySavedRegistration);
  const missing = primed.filter((item) => item.id && !normalizeProgramType(item.program_type));
  if (!missing.length) return primed;

  const extras = new Map<number, Partial<ClientListItem>>();
  await Promise.all(
    missing.slice(0, 80).map(async (item) => {
      try {
        const detail = await loadDetail(item.id);
        const program_type = detail.program_type ?? null;
        const retraining_type = detail.retraining_type ?? null;
        rememberClientRegistration(item.id, program_type, retraining_type);
        extras.set(item.id, detail);
      } catch {
        /* detail yo'q */
      }
    })
  );

  return primed.map((item) => {
    const extra = extras.get(item.id);
    if (!extra) return item;
    return {
      ...item,
      program_type: extra.program_type ?? item.program_type,
      retraining_type: extra.retraining_type ?? item.retraining_type,
      dastur: extra.dastur ?? item.dastur,
      program_label: extra.program_label ?? item.program_label,
      field_of_study: extra.field_of_study ?? item.field_of_study,
      supervisor_id: extra.supervisor_id ?? item.supervisor_id,
      supervisor_name: extra.supervisor_name ?? item.supervisor_name,
    };
  });
}

export function paginateList<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / Math.max(1, perPage)));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    totalPages,
    page: safePage,
    total: items.length,
  };
}

/** Frontend-only: backend program/retraining query yubormaydi. */
export function filterClientsByProgram(
  items: ClientListItem[],
  program: ClientProgramFilter,
  retrainingType?: ClientRetrainingFilter | null
) {
  return items.filter((item) => {
    const type = normalizeProgramType(item.program_type);
    if (program === "MALAKA_OSHIRISH") return type === "MALAKA_OSHIRISH";
    if (type !== "QAYTA_TAYYORLASH") return false;
    if (!retrainingType) return true;
    return normalizeRetrainingType(item.retraining_type) === retrainingType;
  });
}

export function filterClientsByAccountStatus(items: ClientListItem[], status?: AccountStatus | "") {
  if (!status) return items;
  return items.filter((item) => String(item.account_status ?? "").toLowerCase() === status);
}

export function searchClients(items: ClientListItem[], q?: string) {
  const needle = (q ?? "").trim().toLowerCase();
  if (!needle) return items;
  return items.filter((item) => {
    const hay = [
      item.first_name,
      item.last_name,
      item.middle_name,
      item.father_name,
      item.full_name,
      item.email,
      item.phone,
      item.phone_number,
      item.public_id,
      item.id != null ? String(item.id) : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

export function withListQueryRegistration(
  items: ClientListItem[],
  program: ClientProgramFilter,
  retrainingType?: ClientRetrainingFilter | null
) {
  return items.map((item) => ({
    ...item,
    program_type: item.program_type || program,
    retraining_type:
      item.retraining_type ||
      (program === "QAYTA_TAYYORLASH" ? retrainingType ?? null : item.retraining_type),
  }));
}

export async function loadClientFilterCounts(
  count: (query: { program_type?: string; retraining_type?: string }) => Promise<number>
) {
  const [malaka, umumiy, pedagogik, kasbiy] = await Promise.all([
    count({ program_type: "MALAKA_OSHIRISH" }),
    count({
      program_type: "QAYTA_TAYYORLASH",
      retraining_type: "UMUMIY_QAYTA_TAYYORLASH",
    }),
    count({
      program_type: "QAYTA_TAYYORLASH",
      retraining_type: "PEDAGOGIK_QAYTA_TAYYORLASH",
    }),
    count({
      program_type: "QAYTA_TAYYORLASH",
      retraining_type: "KASBIY_QAYTA_TAYYORLASH",
    }),
  ]);
  return {
    program: {
      MALAKA_OSHIRISH: malaka,
      QAYTA_TAYYORLASH: umumiy + pedagogik + kasbiy,
    } satisfies Partial<Record<ClientProgramFilter, number>>,
    retraining: {
      UMUMIY: umumiy,
      PEDAGOGIK: pedagogik,
      KASBIY: kasbiy,
    } satisfies Partial<Record<ClientRetrainingFilter, number>>,
  };
}

export function applyClientListFilters(
  items: ClientListItem[],
  filters: {
    program: ClientProgramFilter;
    retrainingType?: ClientRetrainingFilter | null;
    status?: AccountStatus | "";
    q?: string;
  }
) {
  let result = filterClientsByProgram(
    items,
    filters.program,
    filters.program === "QAYTA_TAYYORLASH" ? filters.retrainingType : null
  );
  result = filterClientsByAccountStatus(result, filters.status);
  return searchClients(result, filters.q);
}

export function countClientsByProgram(items: ClientListItem[]) {
  let malaka = 0;
  let retraining = 0;
  for (const item of items) {
    const type = normalizeProgramType(item.program_type);
    if (type === "QAYTA_TAYYORLASH") retraining += 1;
    else if (type === "MALAKA_OSHIRISH") malaka += 1;
  }
  return {
    MALAKA_OSHIRISH: malaka,
    QAYTA_TAYYORLASH: retraining,
  };
}

export function countClientsByRetraining(items: ClientListItem[]) {
  const qayta = filterClientsByProgram(items, "QAYTA_TAYYORLASH");
  const counts: Record<ClientRetrainingFilter, number> = {
    UMUMIY: 0,
    PEDAGOGIK: 0,
    KASBIY: 0,
  };
  for (const item of qayta) {
    const type = normalizeRetrainingType(item.retraining_type);
    if (type) counts[type] += 1;
  }
  return counts;
}
