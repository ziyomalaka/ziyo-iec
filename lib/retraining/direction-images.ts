import { getCourse } from "@/lib/api/courses";
import { resolveMediaUrl } from "@/lib/api/media";
import { COURSES_API_PREFIX } from "@/lib/api/student-api";
import type { RetrainingCatalogCourse } from "@/lib/api/types/retraining";
import { parsePositiveInt } from "@/lib/api/unwrap";
import { pickDirectionThumbnail } from "@/lib/qualification/direction-image";
import { directionTitlesMatch } from "@/lib/qualification/oliy-directions";
import { isVisibleToStudent } from "@/lib/publish-status";
import {
  isRetrainingPanel,
  panelFromRetrainingType,
  type RetrainingPanel,
} from "@/lib/retraining/admin-panels";
import {
  readRetrainingDirectionSnapshot,
  type RetrainingDirectionThumb,
} from "@/lib/retraining/direction-snapshot";
import type { RetrainingType } from "@/lib/retraining/kind";

type CatalogThumb = {
  id: number;
  name: string;
  image_url?: string;
};

function thumbMatchesPanel(item: RetrainingDirectionThumb, panel: RetrainingPanel) {
  if (item.retraining_panel && isRetrainingPanel(item.retraining_panel)) {
    return item.retraining_panel === panel;
  }
  return panelFromRetrainingType(item.retraining_type) === panel;
}

function publishedThumbs(items: RetrainingDirectionThumb[], panel?: RetrainingPanel): CatalogThumb[] {
  return items
    .filter((item) => isVisibleToStudent(item.status) && (!panel || thumbMatchesPanel(item, panel)))
    .map((item) => ({
      id: item.id,
      name: item.title,
      image_url: resolveMediaUrl(item.thumbnail_url) || undefined,
    }));
}

function matchThumb(course: { id: string; title: string }, items: CatalogThumb[]) {
  const id = parsePositiveInt(course.id);
  const byId = id ? items.find((item) => item.id === id) : undefined;
  if (byId) return byId;
  const titled = items.filter((item) => item.name && directionTitlesMatch(item.name, course.title));
  return titled.length === 1 ? titled[0] : undefined;
}

function withImage<T extends { thumbnailUrl?: string }>(course: T, imageUrl?: string): T {
  const url = resolveMediaUrl(imageUrl || course.thumbnailUrl);
  if (!url || url === course.thumbnailUrl) return course;
  return { ...course, thumbnailUrl: url };
}

function applyThumbs(items: RetrainingCatalogCourse[], thumbs: CatalogThumb[]): RetrainingCatalogCourse[] {
  if (!items.length) return [];
  return items.map((course) => withImage(course, matchThumb(course, thumbs)?.image_url));
}

/** Rasmisiz 1–3 harfli test yo'nalishlari (aaa, ddd, zzz) student katalogiga chiqmasin. */
function isStudentCatalogStub(item: Pick<RetrainingCatalogCourse, "title" | "thumbnailUrl">) {
  const title = item.title.trim();
  if (!title) return true;
  return !resolveMediaUrl(item.thumbnailUrl) && title.length <= 3;
}

async function fillMissingFromStudentDetail(items: RetrainingCatalogCourse[]): Promise<RetrainingCatalogCourse[]> {
  const missing = items.filter((item) => !resolveMediaUrl(item.thumbnailUrl));
  if (!missing.length) return items;
  const found = await Promise.all(
    missing.map(async (course) => {
      try {
        const detail = await getCourse(course.id, true, COURSES_API_PREFIX.retraining);
        const url = resolveMediaUrl(pickDirectionThumbnail(detail) || detail.thumbnail_url);
        return url ? { id: course.id, url } : null;
      } catch {
        return null;
      }
    })
  );
  const byId = new Map(found.filter((item): item is { id: string; url: string } => Boolean(item)).map((item) => [item.id, item.url]));
  if (!byId.size) return items;
  return items.map((course) => withImage(course, byId.get(course.id)));
}

/**
 * Student katalogi: GET /retraining/courses ∩ admin snapshot (shu panel).
 * Snapshot bo'sh yoki yo'nalish o'chirilgan bo'lsa kurs chiqmaydi.
 */
export async function hydrateRetrainingCatalogImages(
  items: RetrainingCatalogCourse[],
  type: RetrainingType
): Promise<RetrainingCatalogCourse[]> {
  const panel = panelFromRetrainingType(type);
  const thumbs = publishedThumbs(await readRetrainingDirectionSnapshot({ forceNetwork: true }), panel);
  const allowed = new Set(thumbs.map((item) => item.id));
  const listed = items.filter((item) => {
    if (isStudentCatalogStub(item)) return false;
    const id = parsePositiveInt(item.id);
    return Boolean(id && allowed.has(id));
  });
  const merged = applyThumbs(listed, thumbs);
  const withPhotos = await fillMissingFromStudentDetail(merged);
  return withPhotos.filter((item) => {
    const id = parsePositiveInt(item.id);
    return Boolean(id && allowed.has(id)) && !isStudentCatalogStub(item);
  });
}
