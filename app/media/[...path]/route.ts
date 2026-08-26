import { NextRequest, NextResponse } from "next/server";
import * as https from "node:https";
import * as http from "node:http";
import { Readable } from "node:stream";
import { API_URL } from "@/lib/server/upstream";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * undici (global fetch) default connectTimeout = 10000ms.
 * Ngrok free tunnel ba'zan 10s+ TCP connect → UND_ERR_CONNECT_TIMEOUT → 502.
 * Shu sabab media uchun node:https ishlatamiz (timeout sozlanadi).
 */
const CONNECT_TIMEOUT_MS = 60_000;
const RESPONSE_TIMEOUT_MS = 120_000;

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
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function shouldStream(path: string, contentLength: number | null, hasRange: boolean) {
  if (hasRange) return true;
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "ogg", "ogv", "mov", "m4v", "mp3", "wav", "m4a", "pdf"].includes(ext)) {
    return true;
  }
  if (contentLength != null && contentLength > 2 * 1024 * 1024) return true;
  return false;
}

function mimeFromPath(path: string) {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "";
}

function looksLikeHtml(bytes: Uint8Array) {
  const head = new TextDecoder("utf-8").decode(bytes.slice(0, 64)).trimStart().toLowerCase();
  return head.startsWith("<!doctype") || head.startsWith("<html") || head.startsWith("<head");
}

type UpstreamResult = {
  status: number;
  headers: Headers;
  body: Readable | null;
};

function fetchUpstreamHttp(
  url: string,
  method: string,
  reqHeaders: Headers
): Promise<UpstreamResult> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib = parsed.protocol === "http:" ? http : https;
    const headerObj: Record<string, string> = {};
    reqHeaders.forEach((value, key) => {
      headerObj[key] = value;
    });

    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: headerObj,
        timeout: CONNECT_TIMEOUT_MS,
      },
      (res) => {
        const headers = new Headers();
        for (const [key, value] of Object.entries(res.headers)) {
          if (value == null) continue;
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
        resolve({
          status: res.statusCode ?? 502,
          headers,
          body: res,
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`CONNECT_TIMEOUT_${CONNECT_TIMEOUT_MS}`));
    });
    req.on("error", reject);
    req.setTimeout(RESPONSE_TIMEOUT_MS);
    req.end();
  });
}

function buildOutHeaders(upstreamHeaders: Headers, relative: string) {
  const guessed = mimeFromPath(relative);
  const out = new Headers();
  for (const key of PASS_HEADERS) {
    const value = upstreamHeaders.get(key);
    if (value) out.set(key, value);
  }
  const ct = out.get("content-type") ?? "";
  if (guessed && (!ct || ct.includes("octet-stream") || ct.includes("text/html"))) {
    out.set("Content-Type", guessed);
  }
  out.set("Content-Disposition", "inline");
  if (!out.has("Accept-Ranges")) out.set("Accept-Ranges", "bytes");
  if (!out.has("Cache-Control")) out.set("Cache-Control", "private, max-age=3600");
  return out;
}

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function streamMedia(request: NextRequest, path: string[]) {
  const relative = path.map((part) => decodeURIComponent(part)).join("/");
  const requestPath = `/media/${relative}`;
  const upstreamUrl = `${API_URL}/media/${relative}${request.nextUrl.search}`;

  console.log("MEDIA REQUEST PATH:", requestPath);
  console.log("MEDIA UPSTREAM URL:", upstreamUrl);
  console.log("TIMEOUT:", {
    connectTimeoutMs: CONNECT_TIMEOUT_MS,
    responseTimeoutMs: RESPONSE_TIMEOUT_MS,
    note: "global fetch undici default connectTimeout was 10000ms",
  });

  const headers = new Headers();
  headers.set("ngrok-skip-browser-warning", "true");
  headers.set("Accept", "*/*");
  headers.set("User-Agent", "ZiyoMalaka/1.0");
  const range = request.headers.get("range");
  if (range) headers.set("Range", range);
  const auth = request.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);

  const startedAt = Date.now();
  const method = request.method === "HEAD" ? "GET" : request.method;
  console.log("MEDIA FETCH START", { url: upstreamUrl, startedAt, range: range ?? null });

  let upstream: UpstreamResult;
  try {
    upstream = await fetchUpstreamHttp(upstreamUrl, method, headers);
  } catch (error) {
    // Bitta qayta urinish — ngrok ephemeral connect
    console.warn("MEDIA FETCH ERROR first attempt — retry", {
      url: upstreamUrl,
      duration: Date.now() - startedAt,
      error,
    });
    try {
      upstream = await fetchUpstreamHttp(upstreamUrl, method, headers);
    } catch (retryError) {
      console.error("MEDIA FETCH ERROR", {
        url: upstreamUrl,
        duration: Date.now() - startedAt,
        error: retryError,
        rootCause: "TCP connect/timeout to ngrok/backend",
      });
      return NextResponse.json(
        {
          message: "Media serverga ulanish timeout (ngrok/backend).",
          upstreamUrl,
          code: "CONNECT_TIMEOUT",
        },
        { status: 502 }
      );
    }
  }

  const duration = Date.now() - startedAt;
  const contentLengthHeader = upstream.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;

  console.log("MEDIA FETCH RESPONSE", {
    status: upstream.status,
    duration,
    contentType: upstream.headers.get("content-type"),
    contentLength,
    acceptRanges: upstream.headers.get("accept-ranges"),
  });

  // Upstream 404/403/500 — 502 ga aylantirmaymiz
  if (upstream.status >= 400 && upstream.status !== 206) {
    let detail = "";
    if (upstream.body) {
      const buf = await readStreamToBuffer(upstream.body);
      detail = buf.toString("utf8").slice(0, 500);
    }
    console.error("MEDIA UPSTREAM NOT OK", {
      status: upstream.status,
      duration,
      bodyPreview: detail.slice(0, 300),
    });
    return NextResponse.json(
      {
        message: "Media upstream xato qaytardi.",
        upstreamStatus: upstream.status,
        upstreamUrl,
        detail,
      },
      { status: upstream.status }
    );
  }

  const out = buildOutHeaders(upstream.headers, relative);
  const ct = (upstream.headers.get("content-type") ?? "").toLowerCase();

  if (ct.includes("text/html")) {
    upstream.body?.destroy();
    console.error("MEDIA UPSTREAM HTML (ngrok/interstitial?)", { duration, ct });
    return NextResponse.json(
      { message: "Media o'rniga HTML keldi (ngrok ogohlantirish?).", upstreamUrl },
      { status: 502 }
    );
  }

  if (request.method === "HEAD") {
    upstream.body?.destroy();
    // Range HEAD → 206 saqlaymiz; oddiy HEAD → 200
    const status =
      upstream.status === 206
        ? range
          ? 206
          : 200
        : upstream.status;
    return new NextResponse(null, { status, headers: out });
  }

  // PDF / video / Range / katta — STREAM (arrayBuffer YO'Q)
  if (upstream.body && shouldStream(relative, contentLength, Boolean(range))) {
    console.log("MEDIA STREAM MODE", { relative, contentLength, range: Boolean(range) });
    const webStream = Readable.toWeb(upstream.body) as unknown as ReadableStream;
    return new NextResponse(webStream, {
      status: upstream.status,
      headers: out,
    });
  }

  if (!upstream.body) {
    return new NextResponse(null, { status: upstream.status, headers: out });
  }

  const buf = await readStreamToBuffer(upstream.body);
  console.log("MEDIA BUFFER MODE", { relative, bytes: buf.length, duration: Date.now() - startedAt });

  if (looksLikeHtml(buf)) {
    return NextResponse.json(
      { message: "Media o'rniga HTML keldi. Backend /media manzilini tekshiring.", upstreamUrl },
      { status: 502 }
    );
  }

  out.set("Content-Length", String(buf.length));
  out.delete("content-range");
  return new NextResponse(buf, {
    status: upstream.status === 206 ? 200 : upstream.status,
    headers: out,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return streamMedia(request, path);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  return streamMedia(request, path);
}
