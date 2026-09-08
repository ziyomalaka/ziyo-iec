import { ApiError } from "@/lib/api/errors";
import {
  createRetrainingApplication,
  getRetrainingApplications as fetchRetrainingApplications,
} from "@/lib/api/retraining";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { parsePositiveInt } from "@/lib/api/unwrap";
import { courseApplicationTitle } from "@/lib/dashboard/course-application";
import { RETRAINING_APPLICATION_TYPE } from "@/lib/retraining/match";

export async function getRetrainingApplications() {
  return fetchRetrainingApplications();
}

export function findRetrainingApplication(
  items: ClientApplicationResponse[],
  course: { id: string; title: string }
) {
  const id = parsePositiveInt(course.id);
  const title = courseApplicationTitle(course.title);
  return items
    .filter((item) => {
      if (id && item.course_id === id) return true;
      if (item.title === title || item.title === course.title) return true;
      return false;
    })
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))[0];
}

export async function applyToRetrainingCourse(course: { id: string; title: string }, notes?: string) {
  const published = parsePositiveInt(course.id);
  if (!published) {
    throw new ApiError(400, "Kurs tanlanishi shart.");
  }
  const payload = {
    title: courseApplicationTitle(course.title),
    type: RETRAINING_APPLICATION_TYPE,
    comment: notes?.trim() || undefined,
    course_id: published,
  };

  try {
    return await createRetrainingApplication(payload);
  } catch (error) {
    const retry = error instanceof ApiError && (error.status === 400 || error.status === 422);
    if (retry) {
      return createRetrainingApplication({
        title: payload.title,
        course_id: published,
        comment: payload.comment,
      });
    }
    throw error instanceof ApiError ? error : new ApiError(400, "Ariza yuborilmadi");
  }
}
