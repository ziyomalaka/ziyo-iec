import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { filterPublishedContentTrees } from "@/lib/publish-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "data", "qualification-snapshot.json");

function asItems(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: unknown[] }).items;
  }
  return [];
}

async function readSnapshot() {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return { items: asItems(parsed), updatedAt: Date.now() };
  } catch {
    return null;
  }
}

export async function GET() {
  const snapshot = await readSnapshot();
  if (!snapshot) {
    return NextResponse.json(
      { items: [], missing: true },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    {
      ...snapshot,
      items: filterPublishedContentTrees(snapshot.items as never[]),
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const items = asItems(body);
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE, JSON.stringify({ items, updatedAt: Date.now() }), "utf8");
  return NextResponse.json({ ok: true, count: items.length });
}
