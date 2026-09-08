import {
  continueFromRetrainingMyCourse,
  getRetrainingLearningCourse,
  getRetrainingMyCourses,
  getRetrainingOverview,
  overviewContinueState,
} from "@/lib/api/retraining";
import { continueFromCourse, type StudentContinueState } from "@/lib/dashboard/continue-learning";

export async function loadRetrainingContinueState(): Promise<StudentContinueState | null> {
  try {
    const overview = await getRetrainingOverview();
    const fromOverview = overviewContinueState(overview);
    if (fromOverview) {
      if (!fromOverview.currentLessonTitle && fromOverview.courseId) {
        const learning = await getRetrainingLearningCourse(fromOverview.courseId, true).catch(() => null);
        if (learning) return continueFromCourse(learning, "/retraining/learning");
      }
      return fromOverview;
    }
  } catch {
    /* overview yo'q — my-courses */
  }

  const my = await getRetrainingMyCourses();
  const active = my[0];
  if (!active) return null;
  const learning = await getRetrainingLearningCourse(active.course_id, true).catch(() => null);
  if (learning) return continueFromCourse(learning, "/retraining/learning");
  return continueFromRetrainingMyCourse(active);
}
