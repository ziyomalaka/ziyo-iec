import { resolveMediaUrl } from "@/lib/api/media";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import { requestLiveRefresh } from "@/lib/live/refresh-bus";
import { directionTitlesMatch } from "@/lib/qualification/oliy-directions";
import {
  isRetrainingPanel,
  panelFromRetrainingType,
  type RetrainingPanel,
} from "@/lib/retraining/admin-panels";
import { normalizeRetrainingType, type RetrainingType } from "@/lib/retraining/kind";

const KEY = "zm_retraining_snapshot";
const PATH = "/api/public-retraining";

export type RetrainingDirectionThumb = {
  id: number;
  title: string;
  thumbnail_url?: string;
  retraining_type?: string;
  retraining_panel?: string;
  status?: string;
};

function asThumbs(data: unknown): RetrainingDirectionThumb[] {
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const item = row as RetrainingDirectionThumb;
      if (!(Number(item.id) > 0)) return null;
      return {
        id: Number(item.id),
        title: String(item.title ?? ""),
        thumbnail_url: item.thumbnail_url || undefined,
        retraining_type: item.retraining_type,
        retraining_panel: item.retraining_panel,
        status: item.status,
      } satisfies RetrainingDirectionThumb;
    })
    .filter((item): item is RetrainingDirectionThumb => item !== null);
}

function slim(item: Pick<QualificationDirection, "id" | "title" | "thumbnail_url" | "retraining_type" | "retraining_panel" | "status">): RetrainingDirectionThumb | null {
  if (!(item.id > 0)) return null;
  return {
    id: item.id,
    title: item.title,
    thumbnail_url: item.thumbnail_url,
    retraining_type: item.retraining_type,
    retraining_panel: item.retraining_panel,
    status: item.status,
  };
}

function fingerprint(items: RetrainingDirectionThumb[]) {
  return JSON.stringify(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      thumbnail_url: item.thumbnail_url,
      retraining_type: item.retraining_type,
      retraining_panel: item.retraining_panel,
      status: item.status,
    }))
  );
}

let memoryCache: RetrainingDirectionThumb[] | null = null;
let inflight: Promise<RetrainingDirectionThumb[]> | null = null;
let lastFingerprint = "";

export function readRetrainingDirectionSnapshotLocal(): RetrainingDirectionThumb[] {
  if (typeof window === "undefined") return [];
  try {
    return asThumbs(JSON.parse(localStorage.getItem(KEY) || "[]"));
  } catch {
    return [];
  }
}

function writeLocal(items: RetrainingDirectionThumb[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export async function readRetrainingDirectionSnapshot(options?: { forceNetwork?: boolean }) {
  const local = readRetrainingDirectionSnapshotLocal();
  if (options?.forceNetwork) {
    inflight = null;
    return fetchSnapshot();
  }
  if (memoryCache) return memoryCache;
  if (local.length) {
    memoryCache = local;
    void fetchSnapshot();
    return local;
  }
  return fetchSnapshot();
}

async function fetchSnapshot(): Promise<RetrainingDirectionThumb[]> {
  if (inflight) return inflight;
  inflight = (async () => {
    const local = readRetrainingDirectionSnapshotLocal();
    try {
      const response = await fetch(`${PATH}?t=${Date.now()}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);
      const missing = Boolean(json && typeof json === "object" && (json as { missing?: boolean }).missing);
      if (!response.ok) {
        memoryCache = local;
        return local;
      }
      if (missing) {
        memoryCache = [];
        return [];
      }
      const items = asThumbs(json);
      writeLocal(items);
      memoryCache = items;
      lastFingerprint = fingerprint(items);
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

async function flush(items: RetrainingDirectionThumb[]) {
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

function itemBelongsToPanel(item: RetrainingDirectionThumb, panel: RetrainingPanel) {
  if (item.retraining_panel && isRetrainingPanel(item.retraining_panel)) {
    return item.retraining_panel === panel;
  }
  return panelFromRetrainingType(item.retraining_type) === panel;
}

function enqueue(items: RetrainingDirectionThumb[], notify = false) {
  writeLocal(items);
  memoryCache = items;
  const changed = fingerprint(items) !== lastFingerprint;
  if (notify && changed) requestLiveRefresh("mutation");
  return flush(items);
}

export function upsertRetrainingDirectionThumbs(
  directions: Array<Pick<QualificationDirection, "id" | "title" | "thumbnail_url" | "retraining_type" | "retraining_panel" | "status">>,
  options?: { notify?: boolean }
) {
  const prev = readRetrainingDirectionSnapshotLocal();
  const byId = new Map(prev.map((item) => [item.id, item]));
  for (const direction of directions) {
    const next = slim(direction);
    if (!next) continue;
    const existing = byId.get(next.id);
    byId.set(next.id, {
      ...existing,
      ...next,
      thumbnail_url: next.thumbnail_url || existing?.thumbnail_url,
    });
  }
  return enqueue(Array.from(byId.values()), options?.notify === true);
}

/** Admin panel ro'yxati — shu panel snapshotini to'liq almashtiradi (bo'sh bo'lsa mijozda ham yo'qoladi). */
export function replaceRetrainingPanelSnapshot(
  panel: RetrainingPanel,
  directions: Array<Pick<QualificationDirection, "id" | "title" | "thumbnail_url" | "retraining_type" | "retraining_panel" | "status">>,
  options?: { notify?: boolean }
) {
  const kept = readRetrainingDirectionSnapshotLocal().filter((item) => {
    if (itemBelongsToPanel(item, panel)) return false;
    return Boolean(item.retraining_panel && isRetrainingPanel(item.retraining_panel)) ||
      Boolean(panelFromRetrainingType(item.retraining_type));
  });
  const next = directions
    .map((item) => slim({ ...item, retraining_panel: panel, retraining_type: item.retraining_type }))
    .filter((item): item is RetrainingDirectionThumb => Boolean(item))
    .map((item) => ({ ...item, retraining_panel: panel }));
  return enqueue([...kept, ...next], options?.notify !== false);
}

export function removeRetrainingDirectionThumb(id: number) {
  return enqueue(
    readRetrainingDirectionSnapshotLocal().filter((item) => item.id !== id),
    true
  );
}

function matchThumb(
  items: RetrainingDirectionThumb[],
  course: { id: string; title: string; retrainingType?: string | null },
  type: RetrainingType
) {
  const scoped = items.filter((item) => {
    const itemType = normalizeRetrainingType(item.retraining_type);
    return !itemType || itemType === type;
  });
  const courseId = Number(course.id);
  const byId = scoped.find((item) => item.id === courseId);
  if (byId) return byId;
  const byTitle = scoped.filter((item) => directionTitlesMatch(item.title, course.title));
  if (byTitle.length === 1) return byTitle[0];
  return null;
}

export function overlayRetrainingThumbnails<
  T extends { id: string; title: string; thumbnailUrl?: string; retrainingType?: string | null },
>(items: T[], thumbs: RetrainingDirectionThumb[], type: RetrainingType): T[] {
  if (!thumbs.length) return items;
  return items.map((item) => overlayRetrainingThumbnail(item, thumbs, type));
}

export function overlayRetrainingThumbnail<
  T extends { id: string; title: string; thumbnailUrl?: string; retrainingType?: string | null },
>(course: T, thumbs: RetrainingDirectionThumb[], type: RetrainingType): T {
  const match = matchThumb(thumbs, course, type);
  const url = resolveMediaUrl(match?.thumbnail_url) || course.thumbnailUrl;
  if (!url || url === course.thumbnailUrl) return course;
  return { ...course, thumbnailUrl: url };
}
