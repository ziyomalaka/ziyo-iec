import type { RetrainingType } from "@/lib/retraining/kind";

/** Future backend contract placeholders — keep loose until the API exists. */
export type RetrainingKind = RetrainingType;

export type RetrainingCourseStatus = "open" | "pending" | "enrolled" | string;

export type RetrainingLesson = {
  id: string;
  title: string;
  kind: "material" | "test";
  status: "available" | "current" | "completed" | "locked";
};

export type RetrainingModule = {
  id: string;
  title: string;
  lessons: RetrainingLesson[];
};

export type RetrainingLearningOutline = {
  courseId: string;
  courseTitle: string;
  modules: RetrainingModule[];
};

export type RetrainingApplicant = {
  fullName: string;
  phone: string;
  email: string;
  region: string;
  education: string;
  specialty: string;
  workplace: string;
  position: string;
};
