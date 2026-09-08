import {
  getRetrainingCourseDetail,
  getRetrainingCourseFilters,
  getRetrainingCoursesAll,
} from "@/lib/api/retraining";
import type { CourseListQuery } from "@/lib/api/types/courses";
import type { RetrainingCatalogCourse } from "@/lib/api/types/retraining";
import { studentApplicationKind } from "@/lib/dashboard/student-status";

export async function getRetrainingCourses(query: CourseListQuery = {}): Promise<RetrainingCatalogCourse[]> {
  return getRetrainingCoursesAll(query);
}

export async function getRetrainingCourse(id: string): Promise<RetrainingCatalogCourse | null> {
  const detail = await getRetrainingCourseDetail(id);
  return detail;
}

export async function getRetrainingFilterOptions() {
  const filters = await getRetrainingCourseFilters();
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
