export type LessonFileKind = "pdf" | "image" | "video" | "audio" | "word" | "office" | "text" | "unknown";

function extensionOf(url: string) {
  const path = url.split("?")[0].split("#")[0];
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

export function fileExtension(url?: string | null, fileName?: string | null) {
  const fromName = fileName ? extensionOf(fileName) : "";
  if (fromName) return fromName;
  return url ? extensionOf(url) : "";
}

export function fileKindFromUrl(url: string): LessonFileKind {
  const ext = extensionOf(url);
  if (ext === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext)) return "image";
  if (["mp4", "webm", "ogg", "ogv", "mov", "m4v"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "aac", "oga"].includes(ext)) return "audio";
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "word";
  if (["ppt", "pptx", "xls", "xlsx", "odp", "ods"].includes(ext)) return "office";
  if (["txt", "md", "csv"].includes(ext)) return "text";
  return "unknown";
}

export function fileKindFromMeta(url: string, mime?: string | null, fileName?: string | null): LessonFileKind {
  if (fileName) {
    const fromName = fileKindFromUrl(fileName);
    if (fromName !== "unknown") return fromName;
  }
  const fromUrl = fileKindFromUrl(url);
  if (fromUrl !== "unknown") return fromUrl;
  const fromMime = fileKindFromMime(mime ?? "");
  if (fromMime) return fromMime;
  return "unknown";
}

export function fileKindFromMime(type: string): LessonFileKind | null {
  const mime = type.toLowerCase();
  if (!mime || mime.includes("octet-stream")) return null;
  if (mime.includes("pdf")) return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("text/") || mime.includes("json")) return "text";
  if (mime.includes("msword") || mime.includes("wordprocessingml") || mime.includes("opendocument.text")) {
    return "word";
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    mime.includes("ms-powerpoint") ||
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime.includes("ms-excel") ||
    mime.includes("opendocument.presentation") ||
    mime.includes("opendocument.spreadsheet")
  ) {
    return "office";
  }
  if (mime.includes("officedocument") || mime.includes("opendocument")) return "office";
  return null;
}

export function isPdfMagic(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

export function isZipMagic(bytes: Uint8Array) {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

/** Eski Office binary (.doc / .ppt / .xls) */
export function isOleMagic(bytes: Uint8Array) {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xd0 &&
    bytes[1] === 0xcf &&
    bytes[2] === 0x11 &&
    bytes[3] === 0xe0
  );
}

/** OOXML zip ichidan word / ppt / excel */
export function ooxmlKindFromBytes(bytes: Uint8Array): "word" | "ppt" | "excel" | null {
  const sample = new TextDecoder("latin1").decode(bytes.slice(0, Math.min(bytes.length, 256_000)));
  if (sample.includes("word/") || sample.includes("wordprocessingml")) return "word";
  if (sample.includes("xl/") || sample.includes("spreadsheetml")) return "excel";
  if (sample.includes("ppt/") || sample.includes("presentationml")) return "ppt";
  return null;
}

export function isExcelExt(ext: string) {
  return ["xls", "xlsx", "ods", "csv"].includes(ext);
}

export function isPptExt(ext: string) {
  return ["ppt", "pptx", "odp"].includes(ext);
}

export function publicFileUrl(src: string) {
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).toString();
}

export function canEmbedOffice(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return host !== "localhost" && host !== "127.0.0.1" && !host.endsWith(".local");
  } catch {
    return false;
  }
}

/** Same-origin /media|/uploads → public API URL (Office Online uchun). */
export function backendAbsoluteMediaUrl(src: string) {
  const value = src.trim();
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const origin = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
  if (origin && (value.startsWith("/media/") || value.startsWith("/uploads/"))) {
    return `${origin}${value}`;
  }
  return publicFileUrl(value);
}

export function officeOnlineEmbedUrl(absoluteHttpsUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteHttpsUrl)}`;
}
