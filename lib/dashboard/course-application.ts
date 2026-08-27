import { createApplication } from "@/lib/api/applications";
import { ApiError } from "@/lib/api/errors";
import { parsePositiveInt } from "@/lib/api/unwrap";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { QualificationDirection } from "@/lib/api/types/qualification";
import { applicationStatusLabel } from "@/lib/admin/labels";
import {
  getEducationCourseById,
  isLocalEducationCourseId,
  mergeOliyEducationCourses,
  overlayEducationCourseWithPublished,
} from "@/lib/dashboard/education-catalog";
import { canonicalDirectionTitleKey, directionTitlesMatch } from "@/lib/qualification/oliy-directions";
import { matchPublishedDirectionByTitle, readQualificationSnapshot, readQualificationSnapshotLocal } from "@/lib/qualification/published-snapshot";

export const COURSE_APPLICATION_TYPE = "Kursga ariza";
export const CATALOG_APPLICATION_PREFIX = "catalog:";
export const MANDATORY_BLOCK_TITLE = "Majburiy blog";
export const MANDATORY_BLOCK_SLUG = "mandatory";
export const MANDATORY_BLOCK_LEARNING_HREF = `/dashboard/learning/${MANDATORY_BLOCK_SLUG}`;
const COURSE_APPLICATION_TITLE_SUFFIX = " kursiga qo'shilish";

export function isApprovedApplicationStatus(status?: string | null) {
  const value = (status ?? "").trim().toLowerCase();
  return value === "approved" || value === "accepted" || value === "tasdiqlangan";
}

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
  return `${courseTitle}${COURSE_APPLICATION_TITLE_SUFFIX}`;
}

export function catalogApplicationComment(courseId: string) {
  return `${CATALOG_APPLICATION_PREFIX}${courseId}`;
}

export function parseCatalogApplicationRef(comment?: string | null) {
  const raw = comment?.trim() ?? "";
  if (!raw) return null;
  if (raw.startsWith(CATALOG_APPLICATION_PREFIX)) {
    const id = raw.slice(CATALOG_APPLICATION_PREFIX.length).trim();
    return id || null;
  }
  if (isLocalEducationCourseId(raw)) return raw;
  return null;
}

export function applicationCourseTitle(title?: string | null) {
  const raw = title?.trim() ?? "";
  if (!raw) return "";
  if (raw.toLowerCase().endsWith(COURSE_APPLICATION_TITLE_SUFFIX)) {
    return raw.slice(0, -COURSE_APPLICATION_TITLE_SUFFIX.length).trim();
  }
  return raw;
}

export function resolvePublishedCourseIdByTitle(title: string) {
  const match = matchPublishedDirectionByTitle(readQualificationSnapshotLocal(), title);
  const id = match?.itId ?? match?.id;
  return id && id > 0 ? id : null;
}

async function resolvePublishedCourseId(title: string) {
  const local = resolvePublishedCourseIdByTitle(title);
  if (local) return local;
  try {
    const match = matchPublishedDirectionByTitle(
      await readQualificationSnapshot({ forceNetwork: true }),
      title
    );
    const id = match?.itId ?? match?.id;
    return id && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function numericCourseId(course: { id: string; title: string }, application?: ClientApplicationResponse | null) {
  return (
    parsePositiveInt(course.id) ??
    parseDashboardCourseId(course.id) ??
    application?.course_id ??
    resolvePublishedCourseIdByTitle(course.title)
  );
}

export function courseOpenHref(
  course: { id: string; title: string },
  application?: ClientApplicationResponse | null
) {
  if (isMandatoryBlockCourse(course)) return MANDATORY_BLOCK_LEARNING_HREF;
  const numeric = numericCourseId(course, application);
  if (numeric) return `/dashboard/learning/${numeric}`;
  return `/dashboard/courses/${course.id}`;
}

export function findEducationCourseForApplication(
  application: ClientApplicationResponse,
  published: QualificationDirection[] = readQualificationSnapshotLocal()
) {
  const ref = parseCatalogApplicationRef(application.comment);
  if (ref) {
    const byId = getEducationCourseById(ref);
    if (byId) return overlayEducationCourseWithPublished(byId, published);
  }
  const title = applicationCourseTitle(application.title);
  if (!canonicalDirectionTitleKey(title)) return null;
  return (
    mergeOliyEducationCourses(published).find((course) => directionTitlesMatch(course.title, title)) ?? null
  );
}

export function findCourseApplication(
  items: ClientApplicationResponse[],
  course: { id: string; title: string }
) {
  const id = parsePositiveInt(course.id) ?? parseDashboardCourseId(course.id);
  const title = courseApplicationTitle(course.title);
  const catalogId = isLocalEducationCourseId(course.id) ? course.id : null;
  const titleKey = canonicalDirectionTitleKey(course.title);
  const matches = items.filter((item) => {
    if (id && item.course_id === id) return true;
    if (item.title === title) return true;
    if (id && item.comment === String(id)) return true;
    const commentRef = parseCatalogApplicationRef(item.comment);
    if (catalogId && commentRef === catalogId) return true;
    if (titleKey && directionTitlesMatch(applicationCourseTitle(item.title), course.title)) {
      return !item.type || item.type === COURSE_APPLICATION_TYPE;
    }
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
  if (isTechnicalApplicationComment(item, note)) return "";
  return note;
}

export function applicationSupervisorCommentDraft(item?: { comment?: string | null; course_id?: number } | null) {
  const note = item?.comment?.trim() ?? "";
  if (!note) return "";
  if (isTechnicalApplicationComment(item, note)) return "";
  return note;
}

function isTechnicalApplicationComment(item: { course_id?: number } | null | undefined, note: string) {
  if (!note) return false;
  if (item?.course_id && note === String(item.course_id)) return true;
  return Boolean(parseCatalogApplicationRef(note));
}

export function canReapplyApplication(item?: ClientApplicationResponse | null) {
  if (!item) return true;
  return item.status === "rejected" || item.status === "archived";
}

export async function applyToCourse(course: { id: string; title: string }) {
  const published =
    parsePositiveInt(course.id) ??
    parseDashboardCourseId(course.id) ??
    (await resolvePublishedCourseId(course.title));
  const comment = isLocalEducationCourseId(course.id)
    ? catalogApplicationComment(course.id)
    : published
      ? String(published)
      : undefined;
  const payload = {
    title: courseApplicationTitle(course.title),
    type: COURSE_APPLICATION_TYPE,
    ...(published ? { course_id: published } : {}),
    ...(comment ? { comment } : {}),
  };

  try {
    return await createApplication(payload);
  } catch (error) {
    const retryWithoutCourse =
      Boolean(published) &&
      isLocalEducationCourseId(course.id) &&
      error instanceof ApiError &&
      (error.status === 400 || error.status === 422);
    if (retryWithoutCourse) {
      return createApplication({
        title: payload.title,
        type: COURSE_APPLICATION_TYPE,
        comment: catalogApplicationComment(course.id),
      });
    }
    throw error instanceof ApiError ? error : new ApiError(400, "Ariza yuborilmadi");
  }
}
