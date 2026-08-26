import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "@/lib/server/upstream";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASS_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "cache-control",
  "etag",
  "last-modified",
];

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  ogv: "video/ogg",
  mov: "video/quicktime",
  m4v: "video/x-m4v",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  txt: "text/plain; charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function mimeFromPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext];
}

function isPdfMagic(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

/** /uploads 404 bo'lsa — backend ba'zan faylni /media/... da saqlaydi. */
function candidateUrls(relative: string, search: string) {
  const qs = search || "";
  const urls = [`${API_URL}/uploads/${relative}${qs}`];
  // files/2026/... → media/videos/files/... yoki media/files/...
  if (relative.startsWith("files/")) {
    urls.push(`${API_URL}/media/videos/${relative}${qs}`);
    urls.push(`${API_URL}/media/${relative}${qs}`);
  } else {
    urls.push(`${API_URL}/media/${relative}${qs}`);
    urls.push(`${API_URL}/media/videos/${relative}${qs}`);
  }
  return urls;
}

async function streamUpload(request: NextRequest, path: string[]) {
  const relative = path.map((part) => decodeURIComponent(part)).join("/");
  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "true");
  headers.set("Accept", "*/*");
  headers.set("User-Agent", "ZiyoMalaka/1.0");
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);
  const auth = request.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);

  const method = request.method === "HEAD" ? "GET" : request.method;
  if (request.method === "HEAD" && !range) headers.set("Range", "bytes=0-0");

  let upstream: Response | null = null;
  for (const target of candidateUrls(relative, request.nextUrl.search)) {
    try {
      const res = await fetch(target, { method, headers, redirect: "follow", cache: "no-store" });
      if (res.status === 404 || res.status === 405) {
        await res.body?.cancel();
        continue;
      }
      upstream = res;
      break;
    } catch {
      // keyingi kandidat
    }
  }
  if (!upstream) {
    return NextResponse.json({ message: "Fayl topilmadi." }, { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const guessed = mimeFromPath(relative);
  const shouldInspect =
    request.method === "GET" && !range && (guessed === "application/pdf" || !guessed || contentType.includes("text/html"));

  const out = new Headers();
  for (const key of PASS_HEADERS) {
    const value = upstream.headers.get(key);
    if (value) out.set(key, value);
  }

  if (shouldInspect && upstream.body) {
    const buf = Buffer.from(await upstream.arrayBuffer());
    const pdf = isPdfMagic(buf);
    if (pdf) {
      out.set("Content-Type", "application/pdf");
      out.set("Content-Disposition", "inline");
      out.set("X-Content-Type-Options", "nosniff");
      out.set("Content-Length", String(buf.length));
      out.delete("content-range");
      return new NextResponse(buf, { status: upstream.status === 206 ? 200 : upstream.status, headers: out });
    }
    if (contentType.includes("text/html")) {
      return NextResponse.json(
        { message: "Fayl ochilmadi. Backend /uploads manzilini tekshiring." },
        { status: 502 }
      );
    }
    if (guessed && (!out.get("content-type") || out.get("content-type")?.includes("octet-stream"))) {
      out.set("Content-Type", guessed);
    }
    out.set("Content-Disposition", "inline");
    const type = out.get("content-type") ?? "";
    if (type && !type.includes("octet-stream")) out.set("X-Content-Type-Options", "nosniff");
    out.set("Content-Length", String(buf.length));
    return new NextResponse(buf, { status: upstream.status, headers: out });
  }

  if (guessed && (!out.get("content-type") || out.get("content-type")?.includes("octet-stream"))) {
    out.set("Content-Type", guessed);
  }
  out.set("Content-Disposition", "inline");
  const type = out.get("content-type") ?? "";
  if (type && !type.includes("octet-stream")) out.set("X-Content-Type-Options", "nosniff");
  if (!out.has("Accept-Ranges")) out.set("Accept-Ranges", "bytes");
  if (!out.has("Cache-Control")) out.set("Cache-Control", "private, max-age=3600");

  if (request.method === "HEAD") {
    await upstream.body?.cancel();
    return new NextResponse(null, { status: upstream.status === 206 ? 200 : upstream.status, headers: out });
  }
  return new NextResponse(upstream.body, { status: upstream.status, headers: out });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return streamUpload(request, path);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return streamUpload(request, path);
}
