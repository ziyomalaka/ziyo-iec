import { getItCourses, getItDirections } from "@/lib/api/admin-it";
import { getQualificationDirections } from "@/lib/api/qualification";
import type { ItCourse, ItDirection } from "@/lib/api/types/admin";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import { mergeDirectionLists, mergeItEntities } from "@/lib/qualification/it-bridge";

export async function loadMergedDirections(silentAuth = false) {
  const [qualification, directions, courses] = await Promise.all([
    getQualificationDirections(silentAuth).catch(() => [] as QualificationDirection[]),
    getItDirections({ per_page: 100, page: 1 }, silentAuth).catch(() => [] as ItDirection[]),
    getItCourses({ per_page: 100, page: 1 }, silentAuth).catch(() => [] as ItCourse[]),
  ]);
  const it = mergeItEntities(directions, courses);
  return {
    qualification,
    it,
    merged: mergeDirectionLists(qualification, it),
  };
}
