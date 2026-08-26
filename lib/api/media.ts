import { API_BASE } from "@/lib/api/client";

type FileRef = {
  url?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  content_url?: string | null;
  storage_path?: string | null;
  file?: { url?: string | null; storage_path?: string | null } | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function firstPath(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** To'liq URL / blob / data. */
export function isDirectMediaUrl(path?: string) {
  const value = path?.trim() ?? "";
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("blob:") ||
    value.startsWith("data:")
  );
}

/**
 * Backend file_url ni ochish:
 * - `/media/...` → same-origin `/media/...` (proxy)
 * - to'liq ngrok/API URL (`.../media/...`) → same-origin `/media/...`
 * - `file_url` ni hech qachon `/uploads/...` ga o'zgartirmaymiz.
 */
export function toSameOriginProxyUrl(path?: string) {
  const value = path?.trim() ?? "";
  if (!value) return "";

  if (value.startsWith("/media/")) return value;
  if (value.startsWith("/uploads/")) return value;

  if (!isDirectMediaUrl(value) || value.startsWith("blob:") || value.startsWith("data:")) return "";

  try {
    const url = new URL(value);
    const pathName = url.pathname;
    if (pathName.startsWith("/media/") || pathName.startsWith("/uploads/")) {
      return `${pathName}${url.search}`;
    }
    return "";
  } catch {
    return "";
  }
}

/** @deprecated use toSameOriginProxyUrl */
export function toSameOriginMediaUrl(path?: string) {
  return toSameOriginProxyUrl(path);
}

export function isLegacyUploadPath(path?: string) {
  const value = path?.trim() ?? "";
  return value.includes("/uploads/");
}

/**
 * Pathni normalizatsiya qiladi — /media ni /uploads ga aylantirmaydi.
 * Backend `file_url` odatda `/media/...` yoki to'liq URL beradi.
 */
export function toUploadPath(path?: string) {
  if (!path) return "";
  const raw = path.trim().replace(/\\/g, "/");
  if (!raw) return "";

  if (isDirectMediaUrl(raw)) return raw;

  let pathname = raw.startsWith("/") ? raw : `/${raw}`;

  // /media/... — o'zgartirmasdan qoldiramiz
  const mediaMarker = pathname.indexOf("/media/");
  if (mediaMarker >= 0) return pathname.slice(mediaMarker);

  // Allaqachon /uploads bo'lsa — qoldiramiz (eski fayllar)
  const uploadsMarker = pathname.indexOf("/uploads/");
  if (uploadsMarker >= 0) return pathname.slice(uploadsMarker);

  // /files/... — /uploads ga aylantirmaymiz; /media/videos/files sifatida ochamiz
  const filesMarker = pathname.indexOf("/files/");
  if (filesMarker >= 0) return `/media/videos${pathname.slice(filesMarker)}`;

  if (/^\/\d{4}\/\d{2}\//.test(pathname)) return `/media/videos/files${pathname}`;
  return pathname;
}

/**
 * Materialdan URL olish.
 * Muhim: `file_url` birinchi — backend bergan qiymatni ustun qo'yamiz.
 */
export function pickFileUrl(data?: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data.trim();
  const row = asRecord(data);
  const file = asRecord(row.file);
  return firstPath(
    row.file_url,
    row.url,
    row.video_url,
    row.content_url,
    file.url,
    file.storage_path,
    row.storage_path
  );
}

export function materialFilePath(material?: FileRef | null) {
  if (!material) return "";
  return firstPath(
    material.file_url,
    material.url,
    material.video_url,
    material.content_url,
    material.file?.url,
    material.file?.storage_path,
    material.storage_path
  );
}

/**
 * Brauzer src.
 * Qoida: file_url ni /uploads ga o'zgartirma.
 * /media/... yoki to'liq ngrok URL → och.
 */
export function resolveMediaUrl(path?: string) {
  if (!path) return "";
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return trimmed;

  // /media/... — to'g'ridan-to'g'ri (same-origin proxy)
  if (trimmed.startsWith("/media/")) return trimmed;

  // Backend ba'zan relative `videos/files/...` yoki `media/videos/...` beradi
  if (/^videos\/files\//i.test(trimmed)) return `/media/${trimmed}`;
  if (/^media\//i.test(trimmed)) return `/${trimmed}`;

  // To'liq URL — /media yoki /uploads bo'lsa same-origin path, aks holda asl URL
  if (isDirectMediaUrl(trimmed)) {
    const proxied = toSameOriginProxyUrl(trimmed);
    if (proxied) return proxied;
    // To'liq APP_URL/media/... — o'zgartirmasdan same-origin proxy
    return trimmed;
  }

  // Relative /uploads — qoldiramiz
  if (trimmed.startsWith("/uploads/")) return trimmed;

  // Boshqa relative path — /media ga yo'naltiramiz, /uploads ga emas
  const normalized = toUploadPath(trimmed);
  if (!normalized) return "";
  if (isDirectMediaUrl(normalized)) {
    return toSameOriginProxyUrl(normalized) || normalized;
  }
  if (normalized.startsWith("/media/") || normalized.startsWith("/uploads/")) return normalized;
  if (normalized.startsWith("/")) return `${API_BASE}${normalized}`;
  return `${API_BASE}/${normalized}`;
}

export function materialSrc(material?: FileRef | null) {
  return resolveMediaUrl(materialFilePath(material));
}
