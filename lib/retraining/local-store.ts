import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { StoredTestResultRow } from "@/lib/api/learning-progress";
import type { RetrainingMyCourseItem } from "@/lib/api/types/retraining";
import type { Notification } from "@/lib/dashboard/types";
import type { RetrainingType } from "@/lib/retraining/kind";
import {
  DEMO_RETRAINING_MY_COURSES,
  DEMO_RETRAINING_NOTIFICATIONS,
  DEMO_RETRAINING_RESULTS,
} from "@/lib/retraining/mocks";

// TEMPORARY FRONTEND STATE
// Replace with backend user profile when Retraining API is connected.

const APPLICATIONS_KEY = "ziyo_retraining_applications_demo";
const NOTIFICATIONS_KEY = "ziyo_retraining_notifications_demo";
const RESULTS_KEY = "ziyo_retraining_results_demo";
const MY_COURSES_KEY = "ziyo_retraining_my_courses_demo";

type Bucket<T> = Partial<Record<RetrainingType, T[]>>;

function readBucket<T>(key: string): Bucket<T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Bucket<T>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBucket<T>(key: string, bucket: Bucket<T>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(bucket));
}

function readList<T>(key: string, type: RetrainingType, seed: T[]): T[] {
  const bucket = readBucket<T>(key);
  if (Array.isArray(bucket[type])) return bucket[type] as T[];
  bucket[type] = seed;
  writeBucket(key, bucket);
  return seed;
}

function writeList<T>(key: string, type: RetrainingType, items: T[]) {
  const bucket = readBucket<T>(key);
  bucket[type] = items;
  writeBucket(key, bucket);
}

export function readLocalApplications(type: RetrainingType): ClientApplicationResponse[] {
  return readList(APPLICATIONS_KEY, type, []);
}

export function writeLocalApplications(type: RetrainingType, items: ClientApplicationResponse[]) {
  writeList(APPLICATIONS_KEY, type, items);
}

export function readLocalNotifications(type: RetrainingType): Notification[] {
  return readList(NOTIFICATIONS_KEY, type, DEMO_RETRAINING_NOTIFICATIONS[type]);
}

export function writeLocalNotifications(type: RetrainingType, items: Notification[]) {
  writeList(NOTIFICATIONS_KEY, type, items);
}

export function readLocalResults(type: RetrainingType): StoredTestResultRow[] {
  return readList(RESULTS_KEY, type, DEMO_RETRAINING_RESULTS[type]);
}

export function writeLocalResults(type: RetrainingType, items: StoredTestResultRow[]) {
  writeList(RESULTS_KEY, type, items);
}

export function readLocalMyCourses(type: RetrainingType): RetrainingMyCourseItem[] {
  return readList(MY_COURSES_KEY, type, DEMO_RETRAINING_MY_COURSES[type]);
}

export function writeLocalMyCourses(type: RetrainingType, items: RetrainingMyCourseItem[]) {
  writeList(MY_COURSES_KEY, type, items);
}
