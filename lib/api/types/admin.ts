export type StaffRole = "boshqaruv" | "nazoratchi" | "it";
export type AccountStatus = "active" | "inactive" | "blocked";
export type ApplicationStatus = "pending" | "processing" | "approved" | "rejected" | "archived";
export type AppealStatus = "open" | "in_progress" | "resolved" | "rejected";

export type EmployeeResponse = {
  id: number;
  public_id?: string;
  nickname?: string;
  first_name?: string;
  last_name?: string;
  father_name?: string;
  full_name?: string;
  phone_number?: string;
  email?: string;
  role: string;
  role_label?: string;
  avatar_url?: string;
  last_login_at?: string | null;
  created_at?: string;
  last_activity?: string | null;
};

export type CreateEmployeeRequest = {
  nickname: string;
  password: string;
  role: StaffRole;
  email?: string;
  password_plain?: string;
};

export type ClientListItem = {
  id: number;
  public_id?: string;
  first_name?: string;
  last_name?: string;
  father_name?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  city?: string;
  district?: string;
  avatar_url?: string;
  created_at?: string;
  last_login_at?: string | null;
  account_status?: AccountStatus | string;
  status_label?: string;
  password?: string;
  password_plain?: string;
};

export type ClientDetail = ClientListItem & {
  address?: string;
  date_of_birth?: string;
  gender?: string;
  position?: string;
  workplace?: string;
  field_of_study?: string;
};

export type ClientApplication = {
  id: number;
  client_id?: number;
  client_name?: string;
  client_email?: string;
  title: string;
  type?: string;
  status: string;
  status_label?: string;
  comment?: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
};

export type AppealResponse = {
  id: number;
  subject?: string;
  message?: string;
  status?: string;
  status_label?: string;
  created_at?: string;
  client_id?: number;
  client_name?: string;
  client_email?: string;
};

export type MonthlyStat = {
  month: string;
  count: number;
};

export type ManagementReports = {
  total_clients: number;
  new_clients_this_month: number;
  total_employees: number;
  registration_last_6_months?: MonthlyStat[];
};

export type SystemSetting = {
  key: string;
  value: string;
  updated_at?: string;
};

export type ContentHealthLevel = "ok" | "warning" | "critical";

export type HealthLessonNode = {
  id: number;
  title: string;
  lesson_type?: string;
  health?: ContentHealthLevel | string;
  health_label?: string;
  has_content?: boolean;
  empty?: boolean;
};

export type HealthModuleNode = {
  id: number;
  title: string;
  health?: ContentHealthLevel | string;
  health_label?: string;
  empty?: boolean;
  lessons?: HealthLessonNode[];
};

export type HealthDirectionNode = {
  id: number;
  title: string;
  health?: ContentHealthLevel | string;
  health_label?: string;
  empty?: boolean;
  modules?: HealthModuleNode[];
};

export type LessonsByType = {
  video?: number;
  presentation?: number;
  guide?: number;
  test?: number;
};

export type SystemContentHealth = {
  directions_total: number;
  modules_total: number;
  lessons_total: number;
  lessons_by_type: LessonsByType;
  empty_directions: number;
  empty_modules: number;
  lessons_without_content: number;
  health: ContentHealthLevel | string;
  health_label?: string;
  directions: HealthDirectionNode[];
};

export type SystemHealth = {
  database: string;
  table_count: number;
  migration_version: number;
  migration_dirty: boolean;
  health?: ContentHealthLevel | string;
  health_label?: string;
  content?: SystemContentHealth;
};

export type ItListQuery = {
  page?: number;
  per_page?: number;
  q?: string;
  category_id?: number;
};

export type CreateITCourseRequest = {
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration_hours?: number;
  language?: string;
  course_type?: string;
  subject?: string;
  status?: string;
  category_id?: number;
  modules?: CreateItModuleRequest[];
};

export type ItCourse = {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration_hours?: number;
  duration_label?: string;
  language?: string;
  course_type?: string;
  subject?: string;
  status?: string;
  status_label?: string;
  category_id?: number;
  category_name?: string;
  modules?: ItModule[];
};

export type ITUserRoleResponse = {
  id: number;
  email?: string;
  role: string;
  role_label?: string;
};

export type LessonType = "video" | "presentation" | "guide" | "test";
export type ItItemType = "lesson" | "test";

export type ItMaterialType =
  | "video"
  | "presentation"
  | "lecture"
  | "seminar"
  | "laboratory"
  | "test"
  | "pdf"
  | "word";

export type ItMaterial = {
  id: number;
  lesson_id?: number;
  material_type?: ItMaterialType | string;
  type_label?: string;
  status?: string;
  title: string;
  content_text?: string;
  url?: string;
  file_url?: string;
  file?: { url?: string };
  order_index?: number;
};

export type ItAssignment = {
  id: number;
  lesson_id?: number;
  title: string;
  description?: string;
  file_url?: string;
  order_index?: number;
};

export type CreateItMaterialRequest = {
  material_type: ItMaterialType;
  title: string;
  content_text?: string;
  file_url?: string;
  order_index?: number;
};

export type CreateItAssignmentRequest = {
  title: string;
  description?: string;
  file_url?: string;
  order_index?: number;
};

export type ItCategory = {
  id: number;
  title: string;
  slug?: string;
};

export type ItLesson = {
  id: number;
  title: string;
  status?: string;
  item_type?: ItItemType | string;
  lesson_type?: LessonType | string;
  description?: string;
  file_url?: string;
  video_url?: string;
  content_url?: string;
  content_text?: string;
  duration_minutes?: number;
  teacher_name?: string;
  order_index?: number;
  materials?: ItMaterial[];
  assignments?: ItAssignment[];
};

export type ItModule = {
  id: number;
  title: string;
  order_index?: number;
  status?: string;
  status_label?: string;
  lessons?: ItLesson[];
  materials?: ItMaterial[];
};

export type ItDirection = {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration_hours?: number;
  duration_label?: string;
  language?: string;
  category_id?: number;
  category_name?: string;
  status?: string;
  status_label?: string;
  module_count?: number;
  course_type?: string;
  subject?: string;
  modules?: ItModule[];
};

export type CreateItDirectionRequest = {
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration_hours?: number;
  language?: string;
  category_id?: number;
  status?: string;
};

export type CreateItModuleRequest = {
  title: string;
  order_index?: number;
  status?: string;
};

export type CreateItLessonRequest = {
  title: string;
  item_type?: ItItemType;
  lesson_type?: LessonType | string;
  description?: string;
  duration_minutes?: number;
  teacher_name?: string;
  video_url?: string;
  file_url?: string;
  content_url?: string;
  content_text?: string;
  order_index?: number;
};

export type ItTestAnswer = {
  id?: number;
  answer: string;
  is_correct: boolean;
};

export type ItTestQuestion = {
  id: number;
  test_id?: number;
  question: string;
  question_type?: string;
  sort_order?: number;
  answers?: ItTestAnswer[];
};

export type ItTest = {
  id: number;
  lesson_id?: number;
  title?: string;
  passing_score?: number;
  duration_minutes?: number;
  attempt_limit?: number;
  questions?: ItTestQuestion[];
};

export type CreateItTestPayload = {
  title: string;
  passing_score?: number;
  duration_minutes?: number;
  attempt_limit?: number;
};

export type CreateItTestQuestionPayload = {
  question: string;
  question_type?: string;
  sort_order?: number;
  answers: { answer: string; is_correct: boolean }[];
};
