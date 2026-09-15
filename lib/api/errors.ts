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

export const FORBIDDEN_ACTION_MESSAGE = "Bu amal uchun ruxsat mavjud emas";

export function isAuthorizationError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403);
}

/** 403/401 — force retry yo'q. Faqat 409/422 business confirmation. */
export function isForceDeleteEligible(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  if (isAuthorizationError(error)) return false;
  return error.status === 409 || error.status === 422;
}

export function isServiceUnavailableError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return error instanceof TypeError || (error instanceof Error && /failed to fetch|network/i.test(error.message));
  }
  return error.status === 0 || error.status === 502 || error.status === 503;
}

export function isBackendUnreachable(error: unknown) {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && /failed to fetch|network|ngrok/i.test(error.message);
  }
  if (error.status === 0 || error.status === 502 || error.status === 503) return true;
  const text = `${error.message} ${error.raw ?? ""}`.toLowerCase();
  return (
    text.includes("ngrok") ||
    text.includes("ishlamayapti") ||
    text.includes("ulanib bo'lmadi") ||
    text.includes("tunnel") ||
    (text.includes("endpoint") && text.includes("offline"))
  );
}

/** PostgreSQL CHECK constraint (masalan lesson_materials_type_check, SQLSTATE 23514). */
export function isDataConstraintError(error: unknown) {
  if (!(error instanceof ApiError)) return false;
  const text = `${error.message} ${error.raw ?? ""}`.toLowerCase();
  return (
    text.includes("23514") ||
    text.includes("check constraint") ||
    text.includes("violates check constraint") ||
    text.includes("lesson_materials_type_check")
  );
}

export function isRetryableUploadError(error: unknown) {
  if (isDataConstraintError(error)) return false;
  if (isBackendUnreachable(error)) return true;
  if (error instanceof ApiError) {
    return error.status === 0 || error.status >= 500;
  }
  return error instanceof TypeError || (error instanceof Error && /failed to fetch|network/i.test(error.message));
}

export function materialUploadErrorMessage(error: unknown): { message: string; retryable: boolean } {
  if (isDataConstraintError(error)) {
    return {
      message: "Material turi tizim tomonidan qabul qilinmadi.",
      retryable: false,
    };
  }
  if (error instanceof ApiError) {
    return { message: error.message, retryable: isRetryableUploadError(error) };
  }
  if (error instanceof Error) {
    return { message: error.message, retryable: isRetryableUploadError(error) };
  }
  return { message: "Material saqlanmadi", retryable: true };
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
