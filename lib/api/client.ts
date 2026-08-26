import { ApiError } from "@/lib/api/errors";
import { unwrapApiPayload } from "@/lib/api/unwrap";
import { clearAuthSession, getAuthToken } from "@/lib/auth/session";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";

function redirectToLogin() {
  if (typeof window === "undefined") return;

  const path = window.location.pathname;
  if (path.includes("/kirish") || path.includes("/royxatdan-otish")) return;

  clearAuthSession();
  const first = path.split("/").filter(Boolean)[0];
  const locale = first === "ru" ? "ru" : "uz";
  window.location.assign(`/${locale}/kirish`);
}

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "/backend";

function sanitizeErrorText(text: string, status: number) {
  const lower = text.toLowerCase();

  if (
    lower.includes("err_ngrok") ||
    (lower.includes("endpoint") && lower.includes("offline"))
  ) {
    return "Backend hozir ishlamayapti. Ngrok tunnel o'chiq — backendni qayta ishga tushiring.";
  }

  if (text.includes("<html") || text.includes("<!DOCTYPE") || text.includes("<!doctype")) {
    if (status === 404) return "So'rov topilmadi. Backend manzilini tekshiring.";
    return "Server xatosi yuz berdi. Qayta urinib ko'ring.";
  }

  return text.trim() || "So'rov bajarilmadi";
}

function collectErrorMessages(data: unknown, field?: string): string[] {
  if (!data) return [];
  if (typeof data === "string") {
    const text = data.trim();
    if (!text) return [];
    if (field && !text.toLowerCase().includes(field.toLowerCase())) {
      return [`${field} ${text}`];
    }
    return [text];
  }
  if (Array.isArray(data)) return data.flatMap((item) => collectErrorMessages(item, field));

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const preferredKeys = ["message", "error", "detail", "details"];
    const fromPreferred = preferredKeys.flatMap((key) => collectErrorMessages(obj[key]));
    if (fromPreferred.length) return fromPreferred;

    return Object.entries(obj).flatMap(([key, value]) => {
      if (key === "status" || key === "code" || key === "success") return [];
      return collectErrorMessages(value, key);
    });
  }

  return [];
}

function parseErrorMessage(text: string, status: number): string {
  if (!text) {
    if (status === 400) return "Ma'lumotlar noto'g'ri. Maydonlarni tekshirib, qayta saqlang.";
    if (status === 422) return "So'rov to'liq emas. Kerakli maydonlarni tekshirib, qayta saqlang.";
    if (status === 404) return "So'rov topilmadi. Backend manzilini tekshiring.";
    if (status === 403) return "Ruxsat yo'q. Admin huquqlaringizni tekshiring.";
    if (status === 409) return "Bunday ma'lumot allaqachon mavjud.";
    return "So'rov bajarilmadi";
  }

  if (status === 409) {
    const lower = text.toLowerCase();
    if (lower.includes("progress")) {
      return "O'quvchi progressi bog'langan — oddiy o'chirish mumkin emas.";
    }
  }

  if (status === 400 || status === 422) {
    try {
      const messages = collectErrorMessages(JSON.parse(text) as unknown);
      if (messages.length) return messages.join(" ");
    } catch {
      // oddiy matn
    }
    return text.trim() || (status === 422
      ? "So'rov to'liq emas. Kerakli maydonlarni tekshirib, qayta saqlang."
      : "Ma'lumotlar noto'g'ri. Maydonlarni tekshirib, qayta saqlang.");
  }

  try {
    const data = JSON.parse(text) as unknown;
    const messages = collectErrorMessages(data);
    if (messages.length) {
      return sanitizeErrorText(messages.join(" "), status);
    }
  } catch {
    // Backend ba'zan oddiy matn yoki HTML qaytaradi
  }

  return sanitizeErrorText(text, status);
}

function emitMutationRefresh(path: string, method?: string) {
  const verb = (method ?? "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD") return;
  if (path.includes("/auth")) return;
  if (typeof window === "undefined") return;
  requestLiveRefresh("mutation", true);
}

function resolveApiUrl(path: string) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const base = API_BASE.replace(/\/$/, "");
  if (/^https?:\/\//i.test(base)) return `${base}${suffix}`;
  if (typeof window !== "undefined") return `${base}${suffix}`;
  const origin = (
    process.env.NEXT_PUBLIC_APP_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://127.0.0.1:3000")
  ).replace(/\/$/, "");
  return `${origin}${base}${suffix}`;
}

function parseJsonBody(raw: string, status: number): unknown {
  const text = raw.trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    if (text.startsWith("{") || text.startsWith("[")) {
      throw new ApiError(status, "Server javobi o'qilmadi. Qayta urinib ko'ring.", raw);
    }
    return raw;
  }
}

export type ApiRequestOptions = RequestInit & {
  skipAuthRedirect?: boolean;
  duplex?: "half";
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  auth = true
): Promise<T> {
  const { skipAuthRedirect, headers: inputHeaders, ...fetchOptions } = options;
  const headers = new Headers(inputHeaders);

  if (auth) {
    const token = getAuthToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  headers.set("ngrok-skip-browser-warning", "true");

  const isFormData = fetchOptions.body instanceof FormData;
  if (fetchOptions.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = String(fetchOptions.method ?? (fetchOptions.body ? "POST" : "GET")).toUpperCase();
  const init: RequestInit & { duplex?: "half" } = {
    ...fetchOptions,
    method,
    headers,
  };

  // Next.js fetch + cache:'no-store' PATCH/POST tanani yutib yuborishi mumkin.
  if (method === "GET" || method === "HEAD") {
    init.cache = "no-store";
    delete init.body;
  } else {
    delete init.cache;
    if (typeof window === "undefined" && init.body) {
      init.duplex = "half";
    }
  }

  let response: Response;
  try {
    response = await fetch(resolveApiUrl(path), init);
  } catch (networkError) {
    const detail = networkError instanceof Error ? networkError.message : String(networkError);
    const isOffline = detail.toLowerCase().includes("failed") || detail.toLowerCase().includes("network");
    throw new ApiError(
      0,
      isOffline
        ? "Internet yoki server bilan aloqa yo'q. Ngrok tunnel ishlayotganini tekshiring."
        : `Serverga ulanib bo'lmadi: ${detail}`
    );
  }

  const raw = await response.text();

  if (!response.ok) {
    const message = parseErrorMessage(raw, response.status);
    if (response.status === 401 && auth && !skipAuthRedirect) {
      redirectToLogin();
    }
    throw new ApiError(response.status, message, raw);
  }

  emitMutationRefresh(path, method);

  if (response.status === 204) {
    return undefined as T;
  }

  const data = parseJsonBody(raw, response.status);
  if (data === undefined) return undefined as T;
  if (typeof data === "string") return data as T;
  return unwrapApiPayload<T>(data);
}

/** GET: admin yo'li 401/403/404 bo'lsa, student/public yo'llarni sinab ko'radi. */
export async function apiRequestFirst<T>(
  paths: string[],
  options: ApiRequestOptions = {},
  auth = true
): Promise<T> {
  let lastError: unknown;
  for (let index = 0; index < paths.length; index++) {
    const isLast = index === paths.length - 1;
    try {
      return await apiRequest<T>(
        paths[index],
        { ...options, skipAuthRedirect: options.skipAuthRedirect || !isLast },
        auth
      );
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new ApiError(404, "So'rov topilmadi");
}
