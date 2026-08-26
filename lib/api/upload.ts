import { ApiError } from "@/lib/api/errors";
import { getAuthToken } from "@/lib/auth/session";
import { unwrapApiPayload } from "@/lib/api/unwrap";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";

export type UploadOptions = {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
};

/** Katta fayl upload /backend proxy orqali ketmasin — to'g'ridan-to'g'ri backend. */
export const UPLOAD_API_URL = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  "https://hassle-conceded-washtub.ngrok-free.dev"
).replace(/\/$/, "");

export async function apiUpload<T>(path: string, formData: FormData, options: UploadOptions = {}): Promise<T> {
  const token = getAuthToken();
  const url = `${UPLOAD_API_URL}${path.startsWith("/") ? path : `/${path}`}`;

  if (url.includes("/backend/") || url.endsWith("/backend")) {
    throw new ApiError(500, "Fayl yuklash proxy orqali emas, to'g'ridan-to'g'ri backend URL ishlatiladi");
  }

  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
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
      reject(new ApiError(xhr.status, raw.trim() || "Fayl yuklanmadi", raw));
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
