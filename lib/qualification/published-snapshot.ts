import type { QualificationDirection } from "@/lib/api/types/qualification";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";
import { filterPublishedContentTree } from "@/lib/publish-status";

const KEY = "zm_qualification_snapshot";
const PATH = "/api/public-qualification";

function asDirections(data: unknown): QualificationDirection[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is QualificationDirection => {
      return Boolean(item && typeof item === "object" && Number((item as QualificationDirection).id) > 0);
    });
  }
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return asDirections((data as { items: unknown }).items);
  }
  return [];
}

function catalogKey(item: Pick<QualificationDirection, "id" | "itId">) {
  return `${item.itId ?? 0}-${item.id}`;
}

function fingerprint(items: QualificationDirection[]) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      itId: item.itId,
      status: item.status,
      modules: (item.modules ?? []).map((module) => ({
        id: module.id,
        status: module.status,
        lessons: (module.lessons ?? []).map((lesson) => ({
          id: lesson.id,
          status: lesson.status,
          n: lesson.lesson_number,
        })),
      })),
    }))
  );
}

function slim(item: QualificationDirection): QualificationDirection {
  const published = filterPublishedContentTree(item);
  const source = published ?? { ...item, modules: [] as NonNullable<QualificationDirection["modules"]> };
  return {
    id: source.id,
    itId: source.itId ?? item.itId,
    title: source.title,
    source: source.source ?? item.source,
    status: source.status,
    category_id: source.category_id,
    category_name: source.category_name,
    modules: (source.modules ?? []).map((module) => ({
      id: module.id,
      title: module.title,
      module_number: module.module_number,
      status: module.status,
      source: module.source,
      lessons: (module.lessons ?? []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        lesson_number: lesson.lesson_number,
        lesson_type: lesson.lesson_type,
        status: lesson.status,
        source: lesson.source,
      })),
    })),
  };
}

let memoryCache: QualificationDirection[] | null = null;
let inflight: Promise<QualificationDirection[]> | null = null;

export function readQualificationSnapshotLocal(): QualificationDirection[] {
  if (typeof window === "undefined") return [];
  try {
    return asDirections(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeLocal(items: QualificationDirection[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export function matchPublishedDirection(items: QualificationDirection[], courseId: number) {
  return items.find((item) => item.id === courseId || item.itId === courseId) ?? null;
}

export async function readQualificationSnapshot(options?: { forceNetwork?: boolean }): Promise<QualificationDirection[]> {
  const local = readQualificationSnapshotLocal();
  if (!options?.forceNetwork && memoryCache) return memoryCache;
  if (!options?.forceNetwork && local.length) {
    memoryCache = local;
    void fetchQualificationSnapshot();
    return local;
  }
  return fetchQualificationSnapshot();
}

async function fetchQualificationSnapshot(): Promise<QualificationDirection[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const local = readQualificationSnapshotLocal();
    try {
      const response = await fetch(`${PATH}?t=${Date.now()}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      const missing = Boolean(json && typeof json === "object" && (json as { missing?: boolean }).missing);
      if (!response.ok || missing) {
        memoryCache = local;
        return local;
      }
      const items = asDirections(json);
      writeLocal(items);
      memoryCache = items;
      return items;
    } catch {
      memoryCache = local;
      return local;
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

let lastFingerprint = "";
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let queued: QualificationDirection[] | null = null;

async function flush() {
  const items = queued;
  queued = null;
  if (!items) return;
  const next = fingerprint(items);
  if (next === lastFingerprint) return;
  lastFingerprint = next;
  try {
    await fetch(PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
  } catch {
    /* ixtiyoriy */
  }
}

function enqueue(items: QualificationDirection[], notify = false, immediate = false) {
  queued = items;
  writeLocal(items);
  memoryCache = items;
  const next = fingerprint(items);
  const changed = next !== lastFingerprint;
  if (notify && changed) requestLiveRefresh("mutation");
  if (immediate || notify || typeof window === "undefined") {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    return flush();
  }
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flush();
  }, 200);
  return Promise.resolve();
}

/** Admin daraxti — incoming modules to'liq almashtiriladi (o'chirilgan dars qolmaydi). */
export function publishQualificationSnapshot(
  items: QualificationDirection[],
  options?: { notify?: boolean; immediate?: boolean }
) {
  const prev = readQualificationSnapshotLocal();
  const byKey = new Map(prev.map((item) => [catalogKey(item), item]));
  for (const item of items) {
    if (!item.id || item.modules === undefined) continue;
    byKey.set(catalogKey(item), slim(item));
  }
  return enqueue(Array.from(byKey.values()), options?.notify === true, options?.immediate === true);
}

export function removeQualificationSnapshot(direction: Pick<QualificationDirection, "id" | "itId">) {
  return enqueue(
    readQualificationSnapshotLocal().filter(
      (item) => item.id !== direction.id && item.itId !== direction.id && item.id !== direction.itId
    ),
    true,
    true
  );
}
