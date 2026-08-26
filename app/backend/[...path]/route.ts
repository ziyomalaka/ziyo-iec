import { NextRequest, NextResponse } from "next/server";
import { API_URL, fetchUpstream, upstreamHeaders } from "@/lib/server/upstream";

export const maxDuration = 300;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFFLINE_MESSAGE =
  "Backend hozir ishlamayapti. Ngrok tunnel o'chiq — backendni qayta ishga tushiring.";

function isNgrokOffline(status: number, body: string, headers: Headers) {
  if (headers.get("ngrok-error-code") === "ERR_NGROK_3200") return true;
  if (headers.get("ngrok-error-code") === "ERR_NGROK_725") return true;
  const text = body.toLowerCase();
  return (
    (status === 403 || status === 404) &&
    (text.includes("err_ngrok") ||
      (text.includes("endpoint") && text.includes("offline")) ||
      text.includes("ngrok-free.dev is offline") ||
      text.includes("bandwidth limit"))
  );
}

function passthrough(response: Response, body: string) {
  const responseHeaders = new Headers();
  const responseType = response.headers.get("content-type");
  if (responseType) responseHeaders.set("Content-Type", responseType);
  responseHeaders.set("Cache-Control", "no-store");

  return new NextResponse(body, {
    status: response.status,
    headers: responseHeaders,
  });
}

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const search = request.nextUrl.search;
  const headers = upstreamHeaders(request.headers);
  const hasBody = !["GET", "HEAD"].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  if (targetPath.includes("/learning/") && targetPath.includes("/tests")) {
    console.log("BACKEND PROXY AUTH:", {
      path: targetPath,
      method: request.method,
      hasAuthorization: headers.has("Authorization"),
      hasCookie: headers.has("Cookie"),
      hasAccept: headers.has("Accept"),
    });
  }

  try {
    const response = await fetchUpstream(`${API_URL}/${targetPath}${search}`, request.method, headers, body);
    const responseBody = await response.text();

    if (isNgrokOffline(response.status, responseBody, response.headers)) {
      return NextResponse.json({ message: OFFLINE_MESSAGE }, { status: 503 });
    }

    if (response.status === 404 && !targetPath.startsWith("api/")) {
      const retry = await fetchUpstream(`${API_URL}/api/${targetPath}${search}`, request.method, headers, body);
      const retryBody = await retry.text();

      if (isNgrokOffline(retry.status, retryBody, retry.headers)) {
        return NextResponse.json({ message: OFFLINE_MESSAGE }, { status: 503 });
      }

      if (retry.status !== 404) {
        return passthrough(retry, retryBody);
      }
    }

    return passthrough(response, responseBody);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown";
    return NextResponse.json(
      { message: "Backendga ulanib bo'lmadi. Qayta urinib ko'ring.", detail },
      { status: 503 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
