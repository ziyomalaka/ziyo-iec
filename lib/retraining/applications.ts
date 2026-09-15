import { ApiError } from "@/lib/api/errors";
import {
  createRetrainingApplication,
  getRetrainingApplications as fetchRetrainingApplications,
} from "@/lib/api/retraining";
import { isRetrainingApiEnabled } from "@/lib/retraining/temp-state";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { parsePositiveInt } from "@/lib/api/unwrap";
import { courseApplicationTitle } from "@/lib/dashboard/course-application";
import type { RetrainingType } from "@/lib/retraining/kind";

export async function getRetrainingApplications(retrainingType?: RetrainingType | null) {
  if (!isRetrainingApiEnabled()) return [];
  if (!retrainingType) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  return fetchRetrainingApplications(retrainingType);
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

export async function applyToRetrainingCourse(
  course: { id: string; title: string },
  _notes?: string,
  retrainingType?: RetrainingType | null
) {
  if (!isRetrainingApiEnabled()) {
    throw new ApiError(503, "Qayta tayyorlash API hozircha o‘chiq.");
  }
  const published = parsePositiveInt(course.id);
  const title = course.title.trim();
  if (!published) {
    throw new ApiError(400, "Kurs tanlanishi shart.");
  }
  if (!title) {
    throw new ApiError(400, "Kurs nomi topilmadi.");
  }
  return createRetrainingApplication({ course_id: published, title }, retrainingType);
}
