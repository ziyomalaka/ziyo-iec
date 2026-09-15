import {
  getRetrainingCourseDetail,
  getRetrainingCourseFilters,
  getRetrainingCoursesAll,
} from "@/lib/api/retraining";
import { isRetrainingApiEnabled } from "@/lib/retraining/temp-state";
import type { CourseListQuery } from "@/lib/api/types/courses";
import type { RetrainingCatalogCourse } from "@/lib/api/types/retraining";
import { studentApplicationKind } from "@/lib/dashboard/student-status";
import type { RetrainingType } from "@/lib/retraining/kind";
import { requireStudentRetrainingType } from "@/lib/retraining/isolate";

function scope(type?: RetrainingType | null) {
  return { retrainingType: requireStudentRetrainingType(type) };
}

export async function getRetrainingCourses(
  query: CourseListQuery = {},
  retrainingType?: RetrainingType | null
): Promise<RetrainingCatalogCourse[]> {
  if (!isRetrainingApiEnabled()) return [];
  return getRetrainingCoursesAll(query, scope(retrainingType));
}

export async function getRetrainingCourse(
  id: string,
  retrainingType?: RetrainingType | null
): Promise<RetrainingCatalogCourse | null> {
  if (!isRetrainingApiEnabled()) return null;
  const detail = await getRetrainingCourseDetail(id, scope(retrainingType));
  return detail;
}

export async function getRetrainingFilterOptions(retrainingType?: RetrainingType | null) {
  if (!isRetrainingApiEnabled()) {
    return { directions: [], subjects: [], types: [], hours: [], statuses: [] };
  }
  const filters = await getRetrainingCourseFilters(scope(retrainingType));
  return {
    directions: filters.directions ?? [],
    subjects: filters.subjects ?? [],
    types: filters.types ?? [],
    hours: filters.hours ?? [],
    statuses: filters.statuses ?? [],
  };
}

function matchesApplicationStatus(course: RetrainingCatalogCourse, status: string) {
  const raw = (course.applicationStatus ?? "").toLowerCase();
  const cta = (course.cta ?? "").toLowerCase();
  if (status === "none") {
    return !raw || raw === "none" || cta === "apply" || cta === "none";
  }
  if (status === "pending") {
    if (cta === "pending") return true;
    if (!raw || raw === "none") return false;
    return studentApplicationKind(raw) === "pending";
  }
  if (status === "approved") {
    return cta === "my_courses" || studentApplicationKind(raw) === "approved";
  }
  if (status === "rejected") {
    return cta === "reapply" || studentApplicationKind(raw) === "rejected";
  }
  return true;
}

export function filterRetrainingCourses(
  items: RetrainingCatalogCourse[],
  query: { search?: string; direction?: string; type?: string; hours?: string; status?: string }
) {
  const search = (query.search ?? "").trim().toLowerCase();
  return items.filter((item) => {
    if (search) {
      const haystack = [item.title, item.description, item.direction, item.subject].join(" ").toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (query.direction && String(item.categoryId ?? item.direction) !== query.direction && item.direction !== query.direction) {
      return false;
    }
    if (query.type && item.courseType !== query.type) return false;
    if (query.hours && String(item.hours) !== query.hours && item.duration !== query.hours) return false;
    if (query.status && !matchesApplicationStatus(item, query.status)) return false;
    return true;
  });
}
