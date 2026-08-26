import { isDirectMediaUrl, resolveMediaUrl } from "@/lib/api/media";
import { getAuthToken } from "@/lib/auth/session";

export function mediaAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "*/*",
    "ngrok-skip-browser-warning": "true",
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Same-origin /media|/uploads — auth; blob/data/tashqi — o'zini. */
export async function fetchMedia(src: string, init: RequestInit = {}) {
  const resolved = resolveMediaUrl(src);
  const isBlobOrData = resolved.startsWith("blob:") || resolved.startsWith("data:");
  const isExternalHttp =
    isDirectMediaUrl(resolved) &&
    !resolved.startsWith("blob:") &&
    !resolved.startsWith("data:") &&
    (resolved.startsWith("http://") || resolved.startsWith("https://"));
  const sameOriginProxy = resolved.startsWith("/media/") || resolved.startsWith("/uploads/");

  const headers = new Headers(init.headers);

  if (sameOriginProxy || (!isExternalHttp && !isBlobOrData)) {
    new Headers(mediaAuthHeaders()).forEach((value, key) => headers.set(key, value));
  } else if (!headers.has("Accept")) {
    headers.set("Accept", "*/*");
  }

  // External absolute URL (kamdan-kam) — ngrok skip qo'shamiz
  if (isExternalHttp && !headers.has("ngrok-skip-browser-warning")) {
    headers.set("ngrok-skip-browser-warning", "true");
  }

  return fetch(resolved, {
    ...init,
    credentials: sameOriginProxy || (!isExternalHttp && !isBlobOrData) ? "same-origin" : "omit",
    headers,
    cache: "no-store",
  });
}
