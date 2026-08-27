import { classifyEducationLevel, displayEducationCategoryName } from "@/lib/dashboard/education-level";
import { resolveMediaUrl } from "@/lib/api/media";
import type {
  CourseCardResponse,
  CourseDetailResponse,
} from "@/lib/api/types/courses";
import type { CourseCatalogItem } from "@/lib/dashboard/types";

const gradients = [
  "from-[#5B4BDB] to-[#2E2A8A]",
  "from-[#0B6B4F] to-[#083D2E]",
  "from-[#0756F5] to-[#043087]",
  "from-[#B45309] to-[#7C2D12]",
] as const;

const tones = ["purple", "green", "blue"] as const;

function toneForId(id: number): CourseCatalogItem["badgeTone"] {
  return tones[Math.abs(id) % tones.length];
}

function gradientForId(id: number) {
  return gradients[Math.abs(id) % gradients.length];
}

function mapCard(course: CourseCardResponse): CourseCatalogItem {
  return {
    id: String(course.id),
    title: course.title,
    direction: displayEducationCategoryName(course.category_name) || course.category_name || "",
    categoryId: course.category_id,
    categoryName: displayEducationCategoryName(course.category_name) || course.category_name,
    institution: classifyEducationLevel(course.category_name, course.course_type, course.title),
    subject: course.subject,
    courseType: course.course_type,
    status: course.status_label || course.status,
    language: course.language_label || course.language || "",
    description: "",
    duration: course.duration_label || (course.duration_hours ? `${course.duration_hours} soat` : ""),
    hours: course.duration_hours ?? 0,
    modulesCount: course.module_count ?? 0,
    studentsCount: 0,
    rating: 0,
    price: 0,
    hasCertificate: true,
    format: "Onlayn",
    level: "",
    imageGradient: gradientForId(course.id),
    thumbnailUrl: resolveMediaUrl(course.thumbnail_url) || undefined,
    badgeTone: toneForId(course.id),
    instructor: "",
    goal: "",
    audience: "",
    lessonsCount: 0,
    syllabus: [],
  };
}

export function mapCourseCard(course: CourseCardResponse) {
  return mapCard(course);
}

export function mapCourseDetail(course: CourseDetailResponse): CourseCatalogItem {
  const base = mapCard(course);
  const modules = [...(course.modules ?? [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  return {
    ...base,
    description: course.description ?? "",
    syllabus: modules.map((module) => ({
      id: String(module.id),
      title: module.title,
      lessons: (module.lessons ?? []).map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title,
        duration: lesson.duration_minutes ? `${lesson.duration_minutes} daq` : "",
        materialsCount: lesson.materials?.length,
        assignmentsCount: lesson.assignments?.length,
      })),
    })),
    lessonsCount: modules.reduce((sum, module) => sum + (module.lessons?.length ?? 0), 0),
    modulesCount: modules.length,
  };
}
