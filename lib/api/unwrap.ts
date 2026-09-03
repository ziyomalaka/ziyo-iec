/** Backend ba'zan { data: T } yoki { profile: T } qaytaradi. */
export function unwrapApiPayload<T>(data: unknown): T {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data as T;

  const obj = data as Record<string, unknown>;
  if (obj.data !== undefined && obj.data !== null && typeof obj.data === "object") {
    const extra = Object.keys(obj).filter(
      (key) => !["data", "message", "success", "status", "error"].includes(key)
    );
    if (extra.length === 0) return obj.data as T;
  }

  return data as T;
}

export function asList<T>(data: unknown, keys: string[] = []): T[] {
  const inner = unwrapApiPayload<unknown>(data);
  if (Array.isArray(inner)) return inner as T[];
  if (inner && typeof inner === "object") {
    const obj = inner as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

export type PagedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

function pagedFromObject<T>(value: unknown): PagedResponse<T> | null {
  if (Array.isArray(value)) {
    return { items: value as T[], total: value.length, page: 1, per_page: value.length || 10, total_pages: 1 };
  }
  if (!value || typeof value !== "object") return null;

  const obj = value as Record<string, unknown>;
  const nested = obj.data && typeof obj.data === "object" && !Array.isArray(obj.data) ? (obj.data as Record<string, unknown>) : null;
  const items = Array.isArray(obj.items)
    ? (obj.items as T[])
    : Array.isArray(obj.data)
      ? (obj.data as T[])
      : nested && Array.isArray(nested.items)
        ? (nested.items as T[])
        : null;
  if (!items) return null;

  const total = Number(obj.total ?? nested?.total ?? obj.count ?? items.length) || items.length;
  const page = Number(obj.page ?? nested?.page ?? obj.current_page ?? 1) || 1;
  const perPage = Number(obj.per_page ?? nested?.per_page ?? obj.limit ?? (items.length || 10)) || 10;
  const totalPages =
    Number(obj.total_pages ?? nested?.total_pages ?? obj.last_page ?? Math.max(1, Math.ceil(total / perPage) || 1)) || 1;
  return { items, total, page, per_page: perPage, total_pages: totalPages };
}

export function asPaged<T>(data: unknown): PagedResponse<T> {
  const inner = unwrapApiPayload<unknown>(data);
  return pagedFromObject<T>(inner) ?? pagedFromObject<T>(data) ?? { items: [], total: 0, page: 1, per_page: 10, total_pages: 0 };
}

export function unwrapNamed<T>(data: unknown, key: string): T {
  const inner = unwrapApiPayload<unknown>(data);
  if (inner && typeof inner === "object" && key in inner) {
    const value = (inner as Record<string, unknown>)[key];
    if (value && typeof value === "object") return value as T;
  }
  return inner as T;
}

export function parseSignedInt(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) return null;
  return n;
}

export function parsePositiveInt(value: unknown): number | null {
  const n = parseSignedInt(value);
  if (n == null || n <= 0) return null;
  return n;
}

export function pickEntityId(data: unknown, keys: string[] = ["id"]): number | null {
  const direct = parsePositiveInt(data);
  if (direct) return direct;
  if (!data || typeof data !== "object") return null;

  const obj = data as Record<string, unknown>;
  for (const key of keys) {
    const found = parsePositiveInt(obj[key]);
    if (found) return found;
  }

  for (const nested of ["data", "lesson", "module", "course", "item"]) {
    if (obj[nested] && typeof obj[nested] === "object") {
      const found = pickEntityId(obj[nested], keys);
      if (found) return found;
    }
  }

  return null;
}
