import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { unwrapApiPayload } from "@/lib/api/unwrap";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";

export type UploadOptions = {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
  method?: "POST" | "PUT" | "PATCH";
  headers?: Record<string, string>;
};

/** Avval to'g'ridan-to'g'ri backend; CORS/ngrok yiqilsa same-origin `/backend` proxy. */
export const UPLOAD_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "https://hassle-conceded-washtub.ngrok-free.dev"
).replace(/\/$/, "");

function uploadTarget(path: string, viaProxy: boolean) {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (viaProxy) {
    if (typeof window === "undefined") {
      throw new ApiError(500, "Fayl yuklash faqat brauzerda ishlaydi");
    }
    return `${window.location.origin}/backend${suffix}`;
  }
  return `${UPLOAD_API_URL}${suffix}`;
}

function shouldRetryUploadViaProxy(error: unknown) {
  if (!(error instanceof ApiError)) return true;
  if (error.status === 0 || error.status === 403 || error.status === 502 || error.status === 503) return true;
  const text = `${error.message} ${error.raw ?? ""}`.toLowerCase();
  return text.includes("ngrok") || text.includes("<html") || text.includes("<!doctype");
}

function sendFormUpload<T>(url: string, formData: FormData, options: UploadOptions = {}): Promise<T> {
  const token = getAuthToken();
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method ?? "POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
    if (options.headers) {
      for (const [key, value] of Object.entries(options.headers)) {
        if (!key || !value) continue;
        if (key.toLowerCase() === "content-type") continue;
        if (key.toLowerCase() === "authorization" && token) continue;
        xhr.setRequestHeader(key, value);
      }
    }
    xhr.responseType = "text";

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      options.onProgress?.(Math.round((event.loaded / event.total) * 100));
    };

    const onAbort = () => xhr.abort();
    options.signal?.addEventListener("abort", onAbort);

    xhr.onload = () => {
      options.signal?.removeEventListener("abort", onAbort);
      const raw = xhr.responseText ?? "";
      if (xhr.status >= 200 && xhr.status < 300) {
        requestLiveRefresh("mutation", true);
        if (!raw) {
          resolve(undefined as T);
          return;
        }
        try {
          resolve(unwrapApiPayload<T>(JSON.parse(raw) as unknown));
        } catch {
          resolve(raw as T);
        }
        return;
      }
      reject(new ApiError(xhr.status, uploadErrorMessage(raw, xhr.status), raw));
    };

    xhr.onerror = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new ApiError(0, "Fayl yuklanmadi"));
    };

    xhr.onabort = () => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(new ApiError(0, "Yuklash bekor qilindi"));
    };

    xhr.send(formData);
  });
}

export async function apiUpload<T>(path: string, formData: FormData, options: UploadOptions = {}): Promise<T> {
  try {
    return await sendFormUpload<T>(uploadTarget(path, false), formData, options);
  } catch (error) {
    if (!shouldRetryUploadViaProxy(error)) throw error;
    if (process.env.NODE_ENV === "development") {
      console.warn("[apiUpload] direct upload failed, retry via /backend", error);
    }
    return sendFormUpload<T>(uploadTarget(path, true), formData, options);
  }
}

function uploadErrorMessage(raw: string, status: number) {
  const text = raw.trim();
  if (!text) return status === 413 ? "Fayl hajmi juda katta." : "Fayl yuklanmadi";
  try {
    const data = JSON.parse(text) as { message?: unknown; error?: unknown };
    const message = [data.message, data.error].map((value) => (typeof value === "string" ? value.trim() : "")).find(Boolean);
    if (message) return message;
  } catch {
    /* oddiy matn */
  }
  if (text.startsWith("{") || text.includes("<html")) return "So'rov bajarilmadi. Qayta urinib ko'ring.";
  return text;
}
