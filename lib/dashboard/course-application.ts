import { createApplication } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/errors";
import { parsePositiveInt } from "@/lib/api/unwrap";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { applicationStatusLabel } from "@/lib/admin/labels";

export const COURSE_APPLICATION_TYPE = "Kursga ariza";
export const MANDATORY_BLOCK_TITLE = "Majburiy blog";
export const MANDATORY_BLOCK_SLUG = "mandatory";
export const MANDATORY_BLOCK_LEARNING_HREF = `/dashboard/learning/${MANDATORY_BLOCK_SLUG}`;

export function isMandatoryBlockCourse(course: { title: string }) {
  return course.title.trim().toLowerCase() === MANDATORY_BLOCK_TITLE.toLowerCase();
}

export function parseMandatoryBlogId(courseId?: string) {
  const value = courseId?.trim().toLowerCase() ?? "";
  const match = value.match(/^(?:mandatory|majburiy-blok|mandatory-blog|mandatory-block)-(\d+)$/);
  return match ? parsePositiveInt(match[1]) : null;
}

export function parseDashboardCourseId(courseId?: string) {
  const value = courseId?.trim() ?? "";
  if (!value) return null;
  const direct = parsePositiveInt(value);
  if (direct) return direct;
  const nested = value.match(/^(?:approved-course-|course-)(\d+)$/i);
  return nested ? parsePositiveInt(nested[1]) : null;
}

export function isMandatoryBlockPath(courseId?: string) {
  const value = courseId?.trim().toLowerCase() ?? "";
  if (!value) return false;
  if (value === MANDATORY_BLOCK_SLUG || value === "majburiy-blok" || value === "mandatory-block") return true;
  return parseMandatoryBlogId(courseId) != null;
}

export function mandatoryLearningHref(id?: number | null) {
  return id ? `/dashboard/learning/mandatory-${id}` : MANDATORY_BLOCK_LEARNING_HREF;
}

export function directionLearningHref(direction: {
  id: string;
  continueHref?: string;
  detailHref?: string;
}) {
  if (direction.continueHref) return direction.continueHref;
  if (direction.detailHref) return direction.detailHref;
  const courseId = parseDashboardCourseId(direction.id);
  if (courseId) return `/dashboard/learning/${courseId}`;
  const blogId = parseMandatoryBlogId(direction.id);
  if (blogId) return mandatoryLearningHref(blogId);
  if (isMandatoryBlockPath(direction.id)) return MANDATORY_BLOCK_LEARNING_HREF;
  return `/dashboard/learning/${direction.id}`;
}

export function courseApplicationTitle(courseTitle: string) {
  return `${courseTitle} kursiga qo'shilish`;
}

export function findCourseApplication(
  items: ClientApplicationResponse[],
  course: { id: string; title: string }
) {
  const id = parsePositiveInt(course.id);
  const title = courseApplicationTitle(course.title);
  const matches = items.filter((item) => {
    if (id && item.course_id === id) return true;
    if (item.title === title) return true;
    if (id && item.comment === String(id)) return true;
    return false;
  });
  return matches.sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
}

export function hasCourseApplication(
  items: ClientApplicationResponse[],
  course: { id: string; title: string }
) {
  const item = findCourseApplication(items, course);
  if (!item) return false;
  return item.status !== "rejected" && item.status !== "archived";
}

export function applicationDecisionLabel(item?: ClientApplicationResponse | null) {
  if (!item) return "";
  if (item.status_label?.trim()) return item.status_label.trim();
  return applicationStatusLabel[item.status] || item.status;
}

export function applicationDecisionNote(item?: ClientApplicationResponse | null) {
  if (!item) return "";
  const note = item.reject_reason?.trim() || item.comment?.trim() || "";
  if (item.course_id && note === String(item.course_id)) return "";
  return note;
}

export function canReapplyApplication(item?: ClientApplicationResponse | null) {
  if (!item) return true;
  return item.status === "rejected" || item.status === "archived";
}

export function applyToCourse(course: { id: string; title: string }) {
  const id = parsePositiveInt(course.id);
  if (!id) {
    return Promise.reject(new ApiError(400, "course_id majburiy"));
  }
  return createApplication({
    title: courseApplicationTitle(course.title),
    type: COURSE_APPLICATION_TYPE,
    course_id: id,
  });
}
