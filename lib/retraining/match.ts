import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { CourseCardResponse } from "@/lib/api/types/courses";
import type { StoredTestResultRow } from "@/lib/api/learning-progress";

export const RETRAINING_COMMENT_PREFIX = "retraining:";
export const RETRAINING_APPLICATION_TYPE = "Qayta tayyorlash";

function compact(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[ʼ‘’`'ʻ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const TYPE_KEYS = [
  "qaytatayyorlash",
  "qayta_tayyorlash",
  "retraining",
  "retrain",
  "perepodgotov",
  "переподготов",
];

export function isRetrainingTypeValue(value?: string | null) {
  const key = compact(value);
  if (!key) return false;
  return TYPE_KEYS.some((item) => key.includes(item));
}

export function isRetrainingCourse(item: Pick<CourseCardResponse, "course_type" | "title" | "category_name" | "subject">) {
  return (
    isRetrainingTypeValue(item.course_type) ||
    isRetrainingTypeValue(item.category_name) ||
    isRetrainingTypeValue(item.subject) ||
    isRetrainingTypeValue(item.title)
  );
}

export function isRetrainingApplication(item: ClientApplicationResponse) {
  const comment = (item.comment ?? "").trim();
  if (comment.startsWith(RETRAINING_COMMENT_PREFIX)) return true;
  if (isRetrainingTypeValue(item.type)) return true;
  return isRetrainingTypeValue(item.title);
}

export function retrainingApplicationComment(courseId: string | number) {
  return `${RETRAINING_COMMENT_PREFIX}catalog:${courseId}`;
}

export function parseRetrainingCourseRef(comment?: string | null) {
  const firstLine = (comment ?? "").trim().split(/\r?\n/)[0] ?? "";
  if (!firstLine.startsWith(RETRAINING_COMMENT_PREFIX)) return null;
  const rest = firstLine.slice(RETRAINING_COMMENT_PREFIX.length);
  if (rest.startsWith("catalog:")) return rest.slice("catalog:".length).trim() || null;
  return rest.trim() || null;
}

export function isRetrainingTechnicalComment(note?: string | null) {
  return (note ?? "").trim().startsWith(RETRAINING_COMMENT_PREFIX);
}

export function titlesLooselyMatch(a?: string | null, b?: string | null) {
  const left = compact(a);
  const right = compact(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function matchesRetrainingLearningCourse(
  course: { id: number; title?: string },
  approvedIds: Set<number>,
  knownTitles: Set<string>
) {
  if (approvedIds.has(course.id)) return true;
  if (isRetrainingTypeValue(course.title)) return true;
  for (const title of knownTitles) {
    if (titlesLooselyMatch(course.title, title)) return true;
  }
  return false;
}

export function isRetrainingResult(item: StoredTestResultRow, retrainingTitles: Set<string>) {
  const title = compact(item.courseTitle);
  if (!title) return false;
  if (isRetrainingTypeValue(item.courseTitle)) return true;
  for (const known of retrainingTitles) {
    const key = compact(known);
    if (key && (title === key || title.includes(key) || key.includes(title))) return true;
  }
  return false;
}
