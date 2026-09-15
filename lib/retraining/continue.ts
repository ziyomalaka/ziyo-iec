import type { StudentContinueState } from "@/lib/dashboard/continue-learning";
import { continueFromRetrainingMyCourse, overviewContinueState } from "@/lib/api/retraining";
import { retrainingGetOverview, retrainingListMyCourses } from "@/lib/retraining/service";

export async function loadRetrainingContinueState(
  learningBase = "/retraining/learning"
): Promise<StudentContinueState | null> {
  try {
    const overview = await retrainingGetOverview();
    const fromOverview = overviewContinueState(overview, learningBase);
    if (fromOverview) return fromOverview;
  } catch {
    /* overview yo'q — my-courses */
  }

  const my = await retrainingListMyCourses();
  const active = my[0];
  if (!active) return null;
  return continueFromRetrainingMyCourse(active, learningBase);
}

export { continueFromCourse };
