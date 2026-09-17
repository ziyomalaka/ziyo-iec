export type FilterOption = {
  value: string;
  label: string;
};

export type CourseCardResponse = {
  id: number;
  title: string;
  category_id?: number;
  category_name?: string;
  subject?: string;
  course_type?: string;
  duration_hours?: number;
  duration_label?: string;
  language?: string;
  language_label?: string;
  module_count?: number;
  module_label?: string;
  status?: string;
  status_label?: string;
  thumbnail_url?: string;
  kind?: string;
  application_id?: number;
  application_status?: string;
  can_apply?: boolean;
  cta?: string;
  reject_reason?: string;
  retraining_type?: string | null;
};

export type CourseLessonSummary = {
  id: number;
  title: string;
  duration_minutes?: number;
  item_type?: string;
  lesson_type?: string;
  status?: string;
  materials?: Array<{
    id?: number;
    title?: string;
    material_type?: string;
    url?: string;
    file_url?: string;
    file?: { url?: string };
    content_text?: string;
    status?: string;
  }>;
  assignments?: Array<{
    title?: string;
    description?: string;
    file_url?: string;
  }>;
};

export type CourseModuleResponse = {
  id: number;
  title: string;
  order_index?: number;
  status?: string;
  description?: string;
  block_id?: number;
  lessons?: CourseLessonSummary[];
};

export type CourseBlockResponse = {
  id: number;
  title: string;
  block_number?: number;
  order_index?: number;
  modules?: CourseModuleResponse[];
};

export type CourseDetailResponse = CourseCardResponse & {
  description?: string;
  goal?: string;
  requirements?: string;
  admission?: string;
  study_form?: string;
  modules?: CourseModuleResponse[];
  blocks?: CourseBlockResponse[];
};

export type CourseListResponse = {
  items: CourseCardResponse[];
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type CourseFiltersResponse = {
  directions: FilterOption[];
  subjects: FilterOption[];
  course_types: FilterOption[];
  hours: FilterOption[];
  modules: FilterOption[];
  statuses: FilterOption[];
};

export type CourseListQuery = {
  q?: string;
  category_id?: string;
  subject?: string;
  course_type?: string;
  hours?: string;
  modules?: string;
  status?: string;
  retraining_type?: string;
  page?: number;
  per_page?: number;
};
