import type { QualificationDirection } from "@/lib/api/types/qualification";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";
import { dropRemovedLessonsFromTree } from "@/lib/publish-status";

const KEY = "zm_mandatory_snapshot";
const PATH = "/api/public-mandatory";
const MEMORY_TTL_MS = 5_000;

function asBlogs(data: unknown): QualificationDirection[] {
  if (Array.isArray(data)) {
    return data.filter((item): item is QualificationDirection => {
      return Boolean(item && typeof item === "object" && Number((item as QualificationDirection).id) > 0);
    });
  }
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return asBlogs((data as { items: unknown }).items);
  }
  return [];
}

function mergeBlog(prev: QualificationDirection | undefined, next: QualificationDirection): QualificationDirection {
  if (!prev) return dropRemovedLessonsFromTree(next);
  if (next.modules === undefined) {
    return {
      ...prev,
      ...next,
      title: next.title?.trim() || prev.title,
      description: next.description ?? prev.description,
      duration_hours: next.duration_hours ?? prev.duration_hours,
      language: next.language || prev.language,
      category_id: next.category_id ?? prev.category_id,
      category_name: next.category_name || prev.category_name,
      modules: prev.modules,
      module_count: prev.modules?.length ?? next.module_count ?? prev.module_count,
    };
  }
  return dropRemovedLessonsFromTree({
    ...prev,
    ...next,
    title: next.title?.trim() || prev.title,
    description: next.description ?? prev.description,
    duration_hours: next.duration_hours ?? prev.duration_hours,
    language: next.language || prev.language,
    category_id: next.category_id ?? prev.category_id,
    category_name: next.category_name || prev.category_name,
    modules: next.modules,
    module_count: next.modules.length,
  });
}

function mergeIncoming(prev: QualificationDirection[], incoming: QualificationDirection[]) {
  return incoming.map((item) => mergeBlog(prev.find((entry) => entry.id === item.id), item));
}

function fingerprint(items: QualificationDirection[]) {
  return JSON.stringify(
    items.map((blog) => ({
      id: blog.id,
      title: blog.title,
      status: blog.status,
      hours: blog.duration_hours,
      lang: blog.language,
      modules: (blog.modules ?? []).map((module) => ({
        id: module.id,
        title: module.title,
        status: module.status,
        lessons: (module.lessons ?? []).map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          status: lesson.status,
          mats: (lesson.materials ?? []).map((item) => ({ id: item.id, status: item.status })),
        })),
      })),
    }))
  );
}

let memoryCache: QualificationDirection[] | null = null;
let memoryCacheAt = 0;
let localUpdatedAt = 0;
let inflightNetwork: Promise<QualificationDirection[]> | null = null;

function readLocalBundle(): { items: QualificationDirection[]; updatedAt: number } {
  if (typeof window === "undefined") return { items: [], updatedAt: 0 };
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "null") as unknown;
    if (Array.isArray(parsed)) return { items: asBlogs(parsed), updatedAt: 0 };
    if (parsed && typeof parsed === "object") {
      const row = parsed as { items?: unknown; updatedAt?: unknown };
      return {
        items: asBlogs(parsed),
        updatedAt: Number(row.updatedAt) || 0,
      };
    }
  } catch {
    /* ignore */
  }
  return { items: [], updatedAt: 0 };
}

export function readMandatorySnapshotLocal(): QualificationDirection[] {
  return readLocalBundle().items;
}

function writeLocal(items: QualificationDirection[], updatedAt = Date.now()) {
  if (typeof window === "undefined") return;
  localUpdatedAt = updatedAt;
  try {
    const raw = JSON.stringify({ items, updatedAt });
    if (localStorage.getItem(KEY) === raw) return;
    localStorage.setItem(KEY, raw);
  } catch {
    /* quota */
  }
}

function rememberMemory(items: QualificationDirection[]) {
  memoryCache = items;
  memoryCacheAt = Date.now();
}

async function fetchMandatorySnapshotFromNetwork(): Promise<QualificationDirection[]> {
  if (inflightNetwork) return inflightNetwork;

  inflightNetwork = (async () => {
    const localBundle = readLocalBundle();
    const local = localBundle.items;
    const localAt = Math.max(localBundle.updatedAt, localUpdatedAt);
    try {
      const response = await fetch(PATH, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      const missing = Boolean(
        json && typeof json === "object" && (json as { missing?: boolean }).missing
      );
      if (!response.ok || missing) {
        rememberMemory(local);
        return local;
      }
      const serverAt = json && typeof json === "object" ? Number((json as { updatedAt?: unknown }).updatedAt) || 0 : 0;
      const items = asBlogs(json).map((item) => dropRemovedLessonsFromTree(item));
      // Admin hozir o'chirgan daraxt (local yangiroq) serverdagi eski fayl bilan qayta tiklanmasin.
      if (local.length && localAt > serverAt) {
        rememberMemory(local);
        return local;
      }
      const next = mergeIncoming(local, items);
      if (local.length && fingerprint(next) === fingerprint(local)) {
        rememberMemory(local);
        return local;
      }
      writeLocal(next, serverAt || Date.now());
      rememberMemory(next);
      return next;
    } catch {
      rememberMemory(local);
      return local;
    }
  })().finally(() => {
    inflightNetwork = null;
  });

  return inflightNetwork;
}

/** Tez o'qish: avval xotira/localStorage, keyin fonda tarmoq yangilash. */
export async function readMandatorySnapshot(options?: { forceNetwork?: boolean }): Promise<QualificationDirection[]> {
  if (!options?.forceNetwork && memoryCache && Date.now() - memoryCacheAt < MEMORY_TTL_MS) {
    return memoryCache;
  }

  const local = readMandatorySnapshotLocal();
  if (!options?.forceNetwork && local.length) {
    rememberMemory(local);
    void fetchMandatorySnapshotFromNetwork();
    return local;
  }

  return fetchMandatorySnapshotFromNetwork();
}

/** Fonda snapshot yangilash — UI bloklanmaydi. */
export function refreshMandatorySnapshotInBackground() {
  void fetchMandatorySnapshotFromNetwork();
}

let lastFingerprint = "";
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let queued: QualificationDirection[] | null = null;

async function flushSnapshot() {
  const items = queued;
  queued = null;
  if (!items) return;
  const nextFingerprint = fingerprint(items);
  const changed = nextFingerprint !== lastFingerprint;
  if (!changed) return;
  lastFingerprint = nextFingerprint;
  try {
    await fetch(PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, updatedAt: localUpdatedAt || Date.now() }),
    });
  } catch {
    /* server cache ixtiyoriy */
  }
}

function enqueueSnapshot(items: QualificationDirection[], notify = false, immediate = false) {
  queued = items.map((item) => dropRemovedLessonsFromTree(item));
  writeLocal(queued);
  rememberMemory(queued);
  const nextFingerprint = fingerprint(queued);
  const changed = nextFingerprint !== lastFingerprint;
  // O'qish yo'llari notify qilmasin — aks holda list↔detail↔modules loop.
  if (notify && changed) requestLiveRefresh("mutation");
  if (immediate || notify || typeof window === "undefined") {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    return flushSnapshot();
  }
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushSnapshot();
  }, 400);
  return Promise.resolve();
}

export type PublishSnapshotOptions = {
  /** true: faqat fingerprint o'zgarganda live-refresh. Default false (read path). */
  notify?: boolean;
  immediate?: boolean;
};

export async function publishMandatorySnapshot(
  items: QualificationDirection[],
  mode: "replace" | "upsert" = "replace",
  options?: PublishSnapshotOptions
) {
  const prev = readMandatorySnapshotLocal();
  const next =
    mode === "replace"
      ? mergeIncoming(prev, items)
      : (() => {
          const merged = [...prev];
          for (const item of items) {
            const index = merged.findIndex((entry) => entry.id === item.id);
            if (index >= 0) merged[index] = mergeBlog(merged[index], item);
            else merged.unshift(mergeBlog(undefined, item));
          }
          return merged;
        })();

  return enqueueSnapshot(next, options?.notify === true, options?.immediate === true);
}

export async function removeMandatorySnapshot(id: number) {
  return enqueueSnapshot(
    readMandatorySnapshotLocal().filter((item) => item.id !== id),
    true,
    true
  );
}
