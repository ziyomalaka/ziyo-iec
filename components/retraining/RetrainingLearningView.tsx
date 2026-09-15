"use client";

import LearningView from "@/components/dashboard/views/LearningView";

export default function RetrainingLearningView({ courseId }: { courseId?: string }) {
  return <LearningView courseId={courseId} />;
}
