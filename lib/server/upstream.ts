export const API_URL = (
  process.env.API_URL ?? "https://hassle-conceded-washtub.ngrok-free.dev"
).replace(/\/$/, "");

type UpstreamInit = RequestInit & { duplex?: "half" };

export function upstreamHeaders(request: Headers, accept = "application/json") {
  const headers = new Headers();
  const auth = request.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const cookie = request.get("cookie");
  if (cookie) headers.set("Cookie", cookie);
  const contentType = request.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const range = request.get("range");
  if (range) headers.set("Range", range);
  headers.set("ngrok-skip-browser-warning", "true");
  headers.set("User-Agent", "ZiyoMalaka/1.0");
  headers.set("Accept", request.get("accept") ?? accept);
  return headers;
}

export async function fetchUpstream(
  target: string,
  method: string,
  headers: Headers,
  body?: ArrayBuffer
) {
  const init: UpstreamInit = {
    method,
    headers,
    cache: "no-store",
    redirect: "follow",
  };
  if (body && body.byteLength > 0) {
    init.body = new Uint8Array(body);
    init.duplex = "half";
  }
  return fetch(target, init);
}
