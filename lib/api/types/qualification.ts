export type QualificationLessonType = "THEORY" | "PRACTICAL";

export type QualificationMaterialType =
  | "VIDEO"
  | "PRESENTATION"
  | "GUIDE"
  | "SEMINAR"
  | "LABORATORY"
  | "TEST";

export type QualificationPublishStatus = "DRAFT" | "PUBLISHED" | "INACTIVE" | "ARCHIVED";

export type ContentSource = "qualification" | "it" | "mandatory";

export type QualificationDirection = {
  id: number;
  title: string;
  source?: ContentSource;
  itId?: number;
  category_id?: number;
  category_name?: string;
  description?: string;
  duration_hours?: number;
  language?: string;
  status?: string;
  module_count?: number;
  modules?: QualificationModule[];
};

export type CreateQualificationDirectionPayload = {
  title: string;
  category_id?: number;
  description?: string;
  duration_hours?: number;
  language?: string;
  status?: string;
};

export type QualificationModule = {
  id: number;
  direction_id?: number;
  module_number?: number;
  title: string;
  status?: string;
  status_label?: string;
  source?: ContentSource;
  lessons?: QualificationLesson[];
};

export type QualificationLesson = {
  id: number;
  module_id?: number;
  lesson_number?: number;
  lesson_code?: string;
  lesson_type?: QualificationLessonType | string;
  title: string;
  status?: string;
  status_label?: string;
  source?: ContentSource;
  materials?: QualificationMaterial[];
};

export type QualificationMaterial = {
  id: number;
  lesson_id?: number;
  type?: QualificationMaterialType | string;
  title?: string;
  status?: string;
  status_label?: string;
  source?: ContentSource;
  url?: string;
  file_url?: string;
  file?: { id?: number; url?: string; storage_path?: string };
};

export type CreateQualificationModulePayload = {
  module_number: number;
  title: string;
  status?: string;
};

export type CreateQualificationLessonPayload = {
  lesson_number: number;
  lesson_type: QualificationLessonType;
  title: string;
};

export type TestQuestionOptionKey = "A" | "B" | "C" | "D";

export type TestQuestion = {
  id: string;
  question: string;
  options: { key: TestQuestionOptionKey; text: string }[];
  correctAnswer: TestQuestionOptionKey;
};

export type MaterialFormData = {
  type: QualificationMaterialType;
  title: string;
  description?: string;
  file: File | null;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number | null;
  durationLabel?: string;
  uploaded: boolean;
  uploadProgress: number;
  uploadError?: string;
  serverId?: number;
  fileId?: number;
  assignment?: string;
  instruction?: string;
  goal?: string;
  procedure?: string;
  questionsCount?: number;
  passingScore?: number;
  durationMinutes?: number;
  attempts?: number;
  questions?: TestQuestion[];
};

export type MaterialWizardState = {
  step: number;
  directionId: number | null;
  directionTitle?: string;
  moduleId: number | null;
  moduleNumber: number | null;
  moduleTitle: string;
  savedModuleNumber?: number | null;
  savedModuleTitle?: string;
  lessonId: number | null;
  lessonNumber: number | null;
  lessonType: QualificationLessonType | null;
  lessonTitle: string;
  lessonCode?: string;
  savedLessonNumber?: number | null;
  savedLessonType?: QualificationLessonType | null;
  savedLessonTitle?: string;
  materialTypes: QualificationMaterialType[];
  materials: MaterialFormData[];
  status: QualificationPublishStatus;
  launchKey?: string;
  source?: ContentSource;
};
