import type { QualificationDirection } from "@/lib/api/types/qualification";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";
import {
  isLessonListedForStudent,
  isModuleListedForStudent,
  isRemovedLessonRecord,
  isRemovedModuleRecord,
} from "@/lib/publish-status";
import { canonicalDirectionTitleKey, directionTitlesMatch } from "@/lib/qualification/oliy-directions";

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
        title: module.title,
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

function listedLessons(module: NonNullable<QualificationDirection["modules"]>[number]) {
  if (module.lessons === undefined) return undefined;
  return (module.lessons ?? [])
    .filter((lesson) => {
      if (lesson.id == null || Number(lesson.id) <= 0) return false;
      if (isRemovedLessonRecord(lesson as Record<string, unknown>)) return false;
      return isLessonListedForStudent(lesson.status);
    })
    .map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      lesson_number: lesson.lesson_number,
      lesson_type: lesson.lesson_type,
      status: lesson.status,
      source: lesson.source,
      materials: (lesson.materials ?? [])
        .filter((material) => isLessonListedForStudent(material.status))
        .map((material) => ({
          id: material.id,
          title: material.title,
          type: material.type,
          url: material.url,
          file_url: material.file_url,
          status: material.status,
        })),
    }));
}

function slim(item: QualificationDirection): QualificationDirection {
  if (!isModuleListedForStudent(item.status)) {
    return {
      id: item.id,
      itId: item.itId,
      title: item.title,
      source: item.source,
      status: item.status,
      category_id: item.category_id,
      category_name: item.category_name,
      duration_hours: item.duration_hours,
      modules: [],
    };
  }
  const modules = (item.modules ?? [])
    .filter((module) => {
      if (module.id == null || Number(module.id) <= 0) return false;
      if (isRemovedModuleRecord(module as Record<string, unknown>)) return false;
      return isModuleListedForStudent(module.status);
    })
    .map((module) => ({
      id: module.id,
      title: module.title,
      module_number: module.module_number,
      status: module.status,
      source: module.source,
      lessons: listedLessons(module),
    }));
  return {
    id: item.id,
    itId: item.itId,
    title: item.title,
    source: item.source,
    status: item.status,
    category_id: item.category_id,
    category_name: item.category_name,
    duration_hours: item.duration_hours,
    modules,
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

function snapshotLessonCount(item: QualificationDirection) {
  return (item.modules ?? []).reduce((sum, module) => sum + (module.lessons?.length ?? 0), 0);
}

function pickRichestDirection(items: QualificationDirection[]) {
  if (!items.length) return null;
  return items.slice().sort(
    (a, b) =>
      snapshotLessonCount(b) - snapshotLessonCount(a) ||
      (b.modules?.length ?? 0) - (a.modules?.length ?? 0) ||
      a.id - b.id
  )[0];
}

export function matchPublishedDirection(items: QualificationDirection[], courseId: number) {
  return pickRichestDirection(items.filter((item) => item.id === courseId || item.itId === courseId));
}

export function matchPublishedDirectionByTitle(items: QualificationDirection[], title: string) {
  if (!canonicalDirectionTitleKey(title)) return null;
  return pickRichestDirection(items.filter((item) => item.id > 0 && directionTitlesMatch(item.title, title)));
}

/** ID yoki nom bo'yicha — darslari bor daraxtni afzal ko'radi (bo'sh dublikatlar emas). */
export function matchPublishedContent(
  items: QualificationDirection[],
  options?: { courseId?: number | null; titles?: Array<string | null | undefined> }
) {
  const candidates: QualificationDirection[] = [];
  if (options?.courseId) {
    const byId = matchPublishedDirection(items, options.courseId);
    if (byId) candidates.push(byId);
  }
  for (const title of options?.titles ?? []) {
    const byTitle = matchPublishedDirectionByTitle(items, title ?? "");
    if (byTitle) candidates.push(byTitle);
  }
  return pickRichestDirection(candidates);
}

export async function readQualificationSnapshot(options?: { forceNetwork?: boolean }): Promise<QualificationDirection[]> {
  const local = readQualificationSnapshotLocal();
  if (options?.forceNetwork) {
    inflight = null;
    return fetchQualificationSnapshot();
  }
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

function keepExistingLessons(
  existing: QualificationDirection | undefined,
  incoming: QualificationDirection,
  replaceEmpty: boolean
): QualificationDirection {
  if (replaceEmpty || !existing?.modules?.length) return incoming;
  const prevById = new Map((existing.modules ?? []).map((module) => [module.id, module]));
  const incomingModules = incoming.modules ?? [];
  if (!incomingModules.length) {
    const kept = (existing.modules ?? [])
      .filter((module) => isModuleListedForStudent(module.status))
      .map((module) => ({
        ...module,
        lessons: (module.lessons ?? []).filter((lesson) => isLessonListedForStudent(lesson.status)),
      }))
      .filter((module) => (module.lessons?.length ?? 0) > 0 || isModuleListedForStudent(module.status));
    return kept.length ? { ...incoming, modules: kept } : incoming;
  }
  return {
    ...incoming,
    modules: incomingModules.map((module) => {
      const prev = prevById.get(module.id);
      if ((module.lessons?.length ?? 0) > 0) return module;
      const prevListed = (prev?.lessons ?? []).filter((lesson) => isLessonListedForStudent(lesson.status));
      if (prevListed.length > 0) return { ...module, lessons: prevListed };
      return module;
    }),
  };
}

function compactSnapshot(items: QualificationDirection[]) {
  const unique = new Map<string, QualificationDirection>();
  for (const item of items) {
    unique.set(catalogKey(item), item);
  }
  const byTitle = new Map<string, QualificationDirection>();
  for (const item of unique.values()) {
    const key = canonicalDirectionTitleKey(item.title) || `id:${catalogKey(item)}`;
    const prev = byTitle.get(key);
    byTitle.set(key, prev ? pickRichestDirection([prev, item])! : item);
  }
  return Array.from(byTitle.values());
}

/** Admin daraxti — incoming modules to'liq almashtiriladi (o'chirilgan dars qolmaydi). */
export function publishQualificationSnapshot(
  items: QualificationDirection[],
  options?: { notify?: boolean; immediate?: boolean; replaceEmpty?: boolean }
) {
  const prev = readQualificationSnapshotLocal();
  const base = prev.length ? prev : memoryCache ?? [];
  const byKey = new Map(base.map((item) => [catalogKey(item), item]));
  for (const item of items) {
    if (!(item.id > 0) || item.modules === undefined) continue;
    const slimmed = slim(item);
    const existing = byKey.get(catalogKey(item));
    byKey.set(catalogKey(item), keepExistingLessons(existing, slimmed, options?.replaceEmpty === true));
  }
  return enqueue(compactSnapshot(Array.from(byKey.values())), options?.notify === true, options?.immediate === true);
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
