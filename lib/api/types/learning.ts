export type LessonItemType = "lesson" | "test";
export type MaterialType = "video" | "presentation" | "lecture" | "pdf" | "word";
export type LearningLessonStatus = "completed" | "current" | "in_progress" | "available" | "locked";
export type ApplicationLearnStatus = "none" | "pending" | "processing" | "approved" | "rejected" | string;

export type LearningLessonSummary = {
  id: number;
  title: string;
  item_type?: LessonItemType | string;
  item_type_label?: string;
  lesson_type?: string;
  lesson_type_label?: string;
  status?: string;
  status_label?: string;
  is_locked?: boolean;
  is_completed?: boolean;
  is_current?: boolean;
  locked?: boolean;
  completed?: boolean;
  /** GET /learning/courses/{id} — darsda test bormi */
  has_tests?: boolean;
  /** Backend: darsdagi testlar soni */
  test_count?: number;
  duration_label?: string;
  order_index?: number;
  lesson_code?: string;
  materials?: LearningMaterial[];
};

export type LearningModule = {
  id: number;
  title: string;
  order_index?: number;
  status?: string;
  lessons?: LearningLessonSummary[];
  items?: LearningLessonSummary[];
};

export type LearningCourseResponse = {
  id: number;
  course_id?: number;
  title: string;
  description?: string;
  enrolled?: boolean;
  can_learn?: boolean;
  application_status?: ApplicationLearnStatus;
  access_message?: string;
  progress_percent?: number;
  current_lesson_id?: number | null;
  /** Kursda umuman test bormi (sidebar) */
  has_tests?: boolean;
  modules?: LearningModule[];
};

export type LearningMaterial = {
  id?: number;
  type?: MaterialType | string;
  material_type?: MaterialType | string;
  title?: string;
  url?: string;
  file_url?: string;
  content_url?: string;
  storage_path?: string;
  mime_type?: string;
  original_name?: string;
  file?: { url?: string; storage_path?: string };
  content_text?: string;
};

export type LearningAssignment = {
  id?: number;
  title?: string;
  description?: string;
  file_url?: string;
  deadline?: string;
  deadline_label?: string;
};

export type LearningLessonDetail = {
  id: number;
  course_id?: number;
  module_id?: number;
  module_title?: string;
  title: string;
  about?: string;
  description?: string;
  teacher_name?: string;
  duration_minutes?: number;
  duration_label?: string;
  video_url?: string;
  file_url?: string;
  content_url?: string;
  content_text?: string;
  lesson_type?: string;
  item_type?: LessonItemType | string;
  status?: string;
  status_label?: string;
  is_locked?: boolean;
  is_completed?: boolean;
  is_current?: boolean;
  locked?: boolean;
  completed?: boolean;
  materials?: LearningMaterial[];
  /** GET /learning/lessons/{id} → tests[] (alohida, materials ichiga ham merge qilinadi) */
  tests?: LearningMaterial[];
  has_tests?: boolean;
  test_count?: number;
  assignments?: LearningAssignment[];
  prev_lesson_id?: number | null;
  next_lesson_id?: number | null;
  previous_lesson_id?: number | null;
};
