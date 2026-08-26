export class ApiError extends Error {
  status: number;
  raw?: string;

  constructor(status: number, message: string, raw?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.raw = raw;
  }
}

export function getApiFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.raw) return {};
  try {
    const data = JSON.parse(error.raw) as unknown;
    if (!data || typeof data !== "object") return {};
    const errors = (data as { errors?: unknown }).errors;
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(errors as Record<string, unknown>)) {
      if (Array.isArray(value) && value.length) out[key] = String(value[0]);
      else if (typeof value === "string") out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}
