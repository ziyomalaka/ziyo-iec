import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { CourseCatalogItem } from "@/lib/dashboard/types";

export type RetrainingCta = "apply" | "pending" | "my_courses" | "reapply" | "none" | string;

export type RetrainingMyCourseItem = {
  course_id: number;
  course_title: string;
  subject?: string;
  duration_hours?: number;
  module_count?: number;
  total_lessons?: number;
  completed_lessons?: number;
  progress_percent?: number;
  current_lesson_id?: number;
  enrolled_at?: string;
  enrollment_status?: string;
  thumbnail_url?: string;
  retraining_type?: string | null;
};

export type RetrainingOverview = {
  program?: string;
  welcome?: string;
  message?: string;
  has_enrollment: boolean;
  progress_percent: number;
  current_lesson_id?: number;
  unread_notifications: number;
  active_course: RetrainingMyCourseItem | null;
  last_result: unknown | null;
};

export type RetrainingCatalogCourse = CourseCatalogItem & {
  applicationId?: number;
  applicationStatus?: string;
  canApply?: boolean;
  cta?: RetrainingCta;
  rejectReason?: string;
};

export type RetrainingCatalogPage = {
  items: RetrainingCatalogCourse[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type { ClientApplicationResponse };
