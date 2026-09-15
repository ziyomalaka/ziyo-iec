import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { StoredTestResultRow } from "@/lib/api/learning-progress";
import type { RetrainingCatalogCourse, RetrainingMyCourseItem } from "@/lib/api/types/retraining";
import type { Notification } from "@/lib/dashboard/types";
import type { RetrainingType } from "@/lib/retraining/kind";
import type { RetrainingLearningOutline } from "@/lib/retraining/types";

/** DEMO data only. Not production backend data. */
const GRADIENT = "from-[#dbeafe] to-[#bfdbfe]";

function demoCourse(
  id: string,
  type: RetrainingType,
  title: string,
  description: string,
  extras: Partial<RetrainingCatalogCourse> = {}
): RetrainingCatalogCourse {
  return {
    id,
    title,
    direction: type === "UMUMIY" ? "Umumiy" : type === "KASBIY" ? "Kasbiy" : "Pedagogik",
    categoryName: type === "UMUMIY" ? "Umumiy" : type === "KASBIY" ? "Kasbiy" : "Pedagogik",
    courseType: "Qayta tayyorlash",
    language: "O'zbek",
    description,
    duration: "8 hafta",
    hours: 72,
    modulesCount: 3,
    studentsCount: 0,
    rating: 0,
    price: 0,
    hasCertificate: true,
    format: "Onlayn",
    level: "Asosiy",
    imageGradient: GRADIENT,
    badgeTone: "blue",
    instructor: "ZiyoMalaka",
    goal: description,
    audience: "Tinglovchilar",
    lessonsCount: 6,
    canApply: true,
    applicationStatus: "none",
    cta: "apply",
    syllabus: [
      {
        id: `${id}-m1`,
        title: "Kirish moduli",
        lessons: [
          { id: `${id}-l1`, title: "Kurs haqida", duration: "20 daqiqa" },
          { id: `${id}-l2`, title: "Asosiy tushunchalar", duration: "30 daqiqa" },
        ],
      },
      {
        id: `${id}-m2`,
        title: "Amaliy modul",
        lessons: [
          { id: `${id}-l3`, title: "Amaliy mashg‘ulot", duration: "40 daqiqa" },
          { id: `${id}-l4`, title: "Mustahkamlash", duration: "25 daqiqa" },
        ],
      },
      {
        id: `${id}-m3`,
        title: "Yakuniy modul",
        lessons: [
          { id: `${id}-l5`, title: "Takrorlash", duration: "20 daqiqa" },
          { id: `${id}-l6`, title: "Yakuniy test", duration: "15 daqiqa" },
        ],
      },
    ],
    ...extras,
  };
}

export const DEMO_RETRAINING_COURSES: Record<RetrainingType, RetrainingCatalogCourse[]> = {
  UMUMIY: [
    demoCourse("101", "UMUMIY", "Umumiy rivojlanish asoslari", "Umumiy bilim va ko‘nikmalarni yangilash kursi."),
    demoCourse("102", "UMUMIY", "Axborot savodxonligi", "Raqamli vositalar va axborot bilan ishlash."),
  ],
  KASBIY: [
    demoCourse("201", "KASBIY", "Kasbiy amaliyotga kirish", "Yangi kasbiy yo‘nalish va amaliy ko‘nikmalar."),
    demoCourse("202", "KASBIY", "Ish jarayoni va kommunikatsiya", "Kasbiy muloqot va ish jarayonini tashkil etish."),
  ],
  PEDAGOGIK: [
    demoCourse("301", "PEDAGOGIK", "Pedagogik metodika asoslari", "Pedagogik faoliyat uchun bilim va metodik ko‘nikmalar."),
    demoCourse("302", "PEDAGOGIK", "Sinfda o‘qitish amaliyoti", "Dars tahlili va o‘quv jarayonini rejalash."),
  ],
};

export const DEMO_RETRAINING_MY_COURSES: Record<RetrainingType, RetrainingMyCourseItem[]> = {
  UMUMIY: [
    {
      course_id: 101,
      course_title: "Umumiy rivojlanish asoslari",
      module_count: 3,
      total_lessons: 6,
      completed_lessons: 2,
      progress_percent: 33,
      current_lesson_id: 2,
      enrolled_at: "2026-09-01",
      enrollment_status: "active",
    },
  ],
  KASBIY: [
    {
      course_id: 201,
      course_title: "Kasbiy amaliyotga kirish",
      module_count: 3,
      total_lessons: 6,
      completed_lessons: 1,
      progress_percent: 16,
      current_lesson_id: 1,
      enrolled_at: "2026-09-01",
      enrollment_status: "active",
    },
  ],
  PEDAGOGIK: [
    {
      course_id: 301,
      course_title: "Pedagogik metodika asoslari",
      module_count: 3,
      total_lessons: 6,
      completed_lessons: 3,
      progress_percent: 50,
      current_lesson_id: 4,
      enrolled_at: "2026-09-01",
      enrollment_status: "active",
    },
  ],
};

export function demoLearningOutline(type: RetrainingType, courseId?: string): RetrainingLearningOutline | null {
  const courses = DEMO_RETRAINING_COURSES[type];
  const course = courseId ? courses.find((item) => item.id === courseId) : courses[0];
  if (!course) return null;
  return {
    courseId: course.id,
    courseTitle: course.title,
    modules: course.syllabus.map((module, moduleIndex) => ({
      id: module.id,
      title: module.title,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        id: lesson.id,
        title: lesson.title,
        kind: lesson.title.toLowerCase().includes("test") ? "test" : "material",
        status: moduleIndex === 0 && lessonIndex === 0 ? "current" : moduleIndex === 0 ? "available" : "locked",
      })),
    })),
  };
}

export const DEMO_RETRAINING_RESULTS: Record<RetrainingType, StoredTestResultRow[]> = {
  UMUMIY: [
    {
      id: "demo-u-1",
      lessonId: 2,
      testId: 1,
      courseId: 101,
      testTitle: "Kirish testi",
      courseTitle: "Umumiy rivojlanish asoslari",
      lessonTitle: "Asosiy tushunchalar",
      attempt: 1,
      percentage: 86,
      score: 86,
      passed: true,
      date: "2026-09-03",
    },
  ],
  KASBIY: [
    {
      id: "demo-k-1",
      lessonId: 1,
      testId: 1,
      courseId: 201,
      testTitle: "Kasbiy kirish testi",
      courseTitle: "Kasbiy amaliyotga kirish",
      lessonTitle: "Kurs haqida",
      attempt: 1,
      percentage: 74,
      score: 74,
      passed: true,
      date: "2026-09-04",
    },
  ],
  PEDAGOGIK: [
    {
      id: "demo-p-1",
      lessonId: 3,
      testId: 1,
      courseId: 301,
      testTitle: "Metodika testi",
      courseTitle: "Pedagogik metodika asoslari",
      lessonTitle: "Amaliy mashg‘ulot",
      attempt: 1,
      percentage: 91,
      score: 91,
      passed: true,
      date: "2026-09-05",
    },
  ],
};

export const DEMO_RETRAINING_NOTIFICATIONS: Record<RetrainingType, Notification[]> = {
  UMUMIY: [
    {
      id: "n-u-1",
      title: "Demo: kurs ochildi",
      text: "Umumiy qayta tayyorlash kursi demo rejimida ochilgan.",
      date: "2026-09-02",
      read: false,
      category: "courses",
      fromAdmin: true,
    },
  ],
  KASBIY: [
    {
      id: "n-k-1",
      title: "Demo: ariza holati",
      text: "Kasbiy qayta tayyorlash arizasi demo rejimida ko‘rsatiladi.",
      date: "2026-09-02",
      read: false,
      category: "courses",
      fromAdmin: true,
    },
  ],
  PEDAGOGIK: [
    {
      id: "n-p-1",
      title: "Demo: dars eslatmasi",
      text: "Pedagogik qayta tayyorlash o‘quv jarayoni demo rejimida.",
      date: "2026-09-02",
      read: false,
      category: "courses",
      fromAdmin: true,
    },
  ],
};

export const DEMO_SEED_APPLICATIONS: Record<RetrainingType, ClientApplicationResponse[]> = {
  UMUMIY: [],
  KASBIY: [],
  PEDAGOGIK: [],
};
