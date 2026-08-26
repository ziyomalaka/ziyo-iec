export type CourseStatus = "active" | "completed" | "pending" | "locked";
export type DirectionStatus = "active" | "completed" | "archived";

export type MyDirection = {
  id: string;
  title: string;
  image: string;
  category: string;
  totalHours: number;
  completedHours: number;
  modules: number;
  language: string;
  startDate: string;
  progress: number;
  status: DirectionStatus;
  currentLessonId?: string;
  progressColor: "blue" | "green" | "orange";
  badgeClass: string;
  showActions?: boolean;
  detailHref?: string;
  continueHref?: string;
};

export type DirectionStats = {
  total: number;
  active: number;
  completed: number;
  archived: number;
  studyHours: number;
};

export type UpcomingLesson = {
  id: string;
  directionId: string;
  directionTitle: string;
  moduleTitle: string;
  date: string;
  time: string;
  type: "video" | "lesson" | "test";
  tone: "purple" | "green" | "blue";
  href?: string;
};

export type ApplicationStatus =
  | "reviewing"
  | "approved"
  | "rejected"
  | "payment_pending"
  | "activated";
export type TestStatus = "available" | "passed" | "failed" | "in_progress";
export type ResultStatus = "success" | "satisfactory" | "retry";
export type LessonStatus = "completed" | "current" | "available" | "locked";
export type NotificationCategory = "all" | "unread" | "courses" | "tests" | "system";

export type DashboardUser = {
  id: number;
  firstName: string;
  lastName: string;
  fatherName: string;
  email: string;
  phone: string;
  role: string;
  avatarInitials: string;
  specialty: string;
  workplace: string;
  position: string;
  qualificationLevel: string;
  region: string;
  district: string;
  experienceYears: number;
  birthDate: string;
};

export type InstitutionType = "maktabgacha" | "umumtalim" | "orta-maxsus" | "oliy";

export type CourseCatalogItem = {
  id: string;
  title: string;
  direction: string;
  institution?: InstitutionType;
  categoryId?: number;
  categoryName?: string;
  subject?: string;
  courseType?: string;
  status?: string;
  language: string;
  description: string;
  duration: string;
  hours: number;
  modulesCount: number;
  studentsCount: number;
  rating: number;
  price: number;
  hasCertificate: boolean;
  format: string;
  level: string;
  imageGradient: string;
  thumbnailUrl?: string;
  badgeTone: "purple" | "green" | "blue";
  instructor: string;
  goal: string;
  audience: string;
  lessonsCount: number;
  syllabus: CourseModule[];
};

export type CourseModule = {
  id: string;
  title: string;
  lessons: {
    id: string;
    title: string;
    duration: string;
    materialsCount?: number;
    assignmentsCount?: number;
  }[];
};

export type MyCourse = {
  id: string;
  courseId: string;
  title: string;
  direction: string;
  startedAt: string;
  duration: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
  score?: number;
  status: CourseStatus;
  instructor: string;
  nextLesson?: string;
  imageGradient: string;
};

export type Application = {
  id: string;
  number: string;
  courseTitle: string;
  courseType: string;
  submittedAt: string;
  status: ApplicationStatus;
  paymentStatus: string;
  note?: string;
  history: { date: string; status: string; comment: string }[];
};

export type LearningModule = {
  id: string;
  title: string;
  lessons: LearningLesson[];
  test?: { id: string; title: string };
};

export type LearningLesson = {
  id: string;
  title: string;
  duration: string;
  status: LessonStatus;
  description: string;
  instructor: string;
  materials: LibraryMaterial[];
  assignments: Assignment[];
};

export type Assignment = {
  id: string;
  title: string;
  description: string;
  deadline: string;
};

export type LibraryMaterial = {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
  language: string;
  format: string;
  pages: number;
  type: string;
  imageGradient: string;
};

export type TestItem = {
  id: string;
  title: string;
  course: string;
  type: "diagnostic" | "topic" | "module" | "final";
  questionsCount: number;
  durationMinutes: number;
  attempts: number;
  passScore: number;
  bestScore?: number;
  status: TestStatus;
};

export type TestQuestion = {
  id: number;
  text: string;
  options: string[];
  correctIndex?: number;
};

export type ResultItem = {
  id: string;
  testTitle: string;
  course: string;
  testType: string;
  score: number;
  percent: number;
  date: string;
  status: ResultStatus;
  correct: number;
  wrong: number;
  timeSpent: string;
};

export type Certificate = {
  id: string;
  title: string;
  courseTitle: string;
  number: string;
  issuedAt: string;
  status: string;
  qrCode: string;
};

export type Notification = {
  id: string;
  title: string;
  text: string;
  date: string;
  read: boolean;
  category: "courses" | "tests" | "system";
  senderId?: number;
  senderName?: string;
  fromAdmin: boolean;
};

export type QualificationEvent = {
  year: number;
  course: string;
  result: string;
  certificate?: string;
  type: "completed" | "current";
};

export type DashboardTask = {
  id: string;
  title: string;
  type: "video" | "assignment" | "test";
  deadline: string;
  course: string;
};

