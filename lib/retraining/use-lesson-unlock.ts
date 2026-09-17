"use client";

import { useEffect, useMemo, useState } from "react";
import {
  computeRetrainingUnlock,
  ensureRetrainingUnlockStarted,
  type RetrainingUnlockState,
} from "@/lib/retraining/lesson-unlock";

export function useRetrainingLessonUnlock(courseId: number, totalLessons = 0): RetrainingUnlockState {
  const [now, setNow] = useState(() => Date.now());
  const [startedAt, setStartedAt] = useState(0);

  useEffect(() => {
    if (!(courseId > 0)) return;
    setStartedAt(ensureRetrainingUnlockStarted(courseId));
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [courseId]);

  return useMemo(
    () => computeRetrainingUnlock(startedAt, now, totalLessons > 0 ? totalLessons : Number.POSITIVE_INFINITY),
    [startedAt, now, totalLessons]
  );
}
