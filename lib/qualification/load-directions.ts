import { getItCoursesPage, getItDirectionsPage } from "@/lib/api/admin-it";
import { getQualificationDirections } from "@/lib/api/qualification";
import type { ItCourse, ItDirection } from "@/lib/api/types/admin";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import { mergeDirectionLists, mergeItEntities } from "@/lib/qualification/it-bridge";
import { OLIY_DIRECTIONS, canonicalDirectionTitleKey, directionTitlesMatch } from "@/lib/qualification/oliy-directions";

function contentScore(item: QualificationDirection) {
  const modules = item.modules ?? [];
  const lessons = modules.reduce((sum, module) => sum + (module.lessons?.length ?? 0), 0);
  return lessons * 1000 + modules.length;
}

export function pickCanonicalDirection(items: QualificationDirection[], title: string) {
  const matches = items.filter((item) => item.id > 0 && directionTitlesMatch(item.title, title));
  if (!matches.length) return null;
  return matches.sort((a, b) => contentScore(b) - contentScore(a) || a.id - b.id)[0];
}

export function orderCanonicalOliyDirections(items: QualificationDirection[]) {
  return OLIY_DIRECTIONS.map((entry) => pickCanonicalDirection(items, entry.title)).filter(
    (item): item is QualificationDirection => item != null
  );
}

export function buildAdminQualificationList(items: QualificationDirection[]): QualificationDirection[] {
  const byTitle = new Map<string, QualificationDirection>();
  for (const item of items) {
    if (!(item.id > 0)) continue;
    const key = canonicalDirectionTitleKey(item.title);
    if (!key) continue;
    const prev = byTitle.get(key);
    if (!prev || contentScore(item) > contentScore(prev) || (contentScore(item) === contentScore(prev) && item.id < prev.id)) {
      byTitle.set(key, item);
    }
  }

  const canonical = OLIY_DIRECTIONS.map((entry, index) => {
    const key = canonicalDirectionTitleKey(entry.title);
    const existing = byTitle.get(key);
    if (existing) {
      byTitle.delete(key);
      return { ...existing, title: entry.title };
    }
    return {
      id: -(index + 1),
      title: entry.title,
      description: entry.description,
      source: "qualification" as const,
      status: "PUBLISHED",
      category_name: "Oliy ta'lim",
      modules: [],
    };
  });

  const extras = Array.from(byTitle.values()).sort((a, b) => a.title.localeCompare(b.title, "uz"));
  return [...canonical, ...extras];
}

async function loadAllPaged<T extends { id: number }>(
  loadPage: (page: number) => Promise<{ items: T[]; total_pages: number; total: number; per_page: number }>
) {
  const first = await loadPage(1);
  const pages = Math.min(
    15,
    Math.max(1, first.total_pages || Math.ceil((first.total || first.items.length) / (first.per_page || 100)) || 1)
  );
  const rest =
    pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, index) => loadPage(index + 2))) : [];
  const byId = new Map<number, T>();
  for (const item of [...first.items, ...rest.flatMap((page) => page.items)]) {
    if (item.id > 0) byId.set(item.id, item);
  }
  return Array.from(byId.values());
}

export async function loadMergedDirections(silentAuth = false) {
  const [qualification, directions, courses] = await Promise.all([
    getQualificationDirections(silentAuth).catch(() => [] as QualificationDirection[]),
    loadAllPaged((page) => getItDirectionsPage({ per_page: 100, page }, silentAuth)).catch(() => [] as ItDirection[]),
    loadAllPaged((page) => getItCoursesPage({ per_page: 100, page }, silentAuth)).catch(() => [] as ItCourse[]),
  ]);
  const it = mergeItEntities(directions, courses);
  const merged = mergeDirectionLists(qualification, it);
  return {
    qualification,
    it,
    merged,
  };
}
