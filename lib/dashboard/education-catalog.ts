import type { CourseCatalogItem, InstitutionType } from "@/lib/dashboard/types";
import type { QualificationDirection, QualificationModule } from "@/lib/api/types/qualification";
import { OLIY_DIRECTIONS, canonicalDirectionTitleKey } from "@/lib/qualification/oliy-directions";
import { isLessonListedForStudent, isModuleListedForStudent, isVisibleToStudent } from "@/lib/publish-status";
import {
  matchPublishedDirectionByTitle,
  readQualificationSnapshotLocal,
} from "@/lib/qualification/published-snapshot";

export type { InstitutionType };

export type EducationDirection = {
  id: string;
  institution: InstitutionType;
  title: string;
  description: string;
  imageGradient: string;
};

export {
  educationLevelLabels as institutionLabels,
  educationLevelTabs as institutionTabs,
} from "@/lib/dashboard/education-level";

const maktabgacha: Array<Pick<EducationDirection, "id" | "title" | "description">> = [];

const maktab: Array<Pick<EducationDirection, "id" | "title" | "description">> = [];

const kollej: Array<Pick<EducationDirection, "id" | "title" | "description">> = [];

const universitet: Array<Pick<EducationDirection, "id" | "title" | "description">> = OLIY_DIRECTIONS.map((item) => ({
  id: item.id,
  title: item.title,
  description: item.description,
}));

const gradients = [
  "from-[#5B4BDB] to-[#2E2A8A]",
  "from-[#0756F5] to-[#043087]",
  "from-[#0B6B4F] to-[#083D2E]",
  "from-[#B45309] to-[#7C2D12]",
  "from-[#0EA5A4] to-[#0F766E]",
  "from-[#7C3AED] to-[#4C1D95]",
] as const;

function withMeta(
  institution: InstitutionType,
  items: Array<Pick<EducationDirection, "id" | "title" | "description">>
): EducationDirection[] {
  return items.map((item, index) => ({
    ...item,
    id: `${institution}-${item.id}`,
    institution,
    imageGradient: gradients[index % gradients.length],
  }));
}

export const educationDirections: EducationDirection[] = [
  ...withMeta("maktabgacha", maktabgacha),
  ...withMeta("umumtalim", maktab),
  ...withMeta("orta-maxsus", kollej),
  ...withMeta("oliy", universitet),
];

const tones = ["purple", "green", "blue"] as const;

function makeCourse(direction: EducationDirection, index: number): CourseCatalogItem {
  const hours = 72;
  const modules = 8;

  return {
    id: `course-${direction.id}`,
    title: direction.title,
    direction: direction.title,
    institution: direction.institution,
    subject: direction.title,
    courseType: "Malaka oshirish",
    status: "Ochiq",
    language: "O'zbek tili",
    description: direction.description,
    duration: "3 oy",
    hours,
    modulesCount: modules,
    studentsCount: 180 + index * 13,
    rating: 4.5,
    price: 0,
    hasCertificate: true,
    format: "Onlayn",
    level: "O'rta",
    imageGradient: direction.imageGradient,
    badgeTone: tones[index % tones.length],
    instructor: "ZiyoMalaka o'qituvchisi",
    goal: `${direction.title} yo'nalishida malaka oshirish.`,
    audience:
      direction.institution === "maktabgacha"
        ? "Maktabgacha ta'lim tarbiyachilari"
        : direction.institution === "umumtalim"
          ? "Umumta'lim maktabi o'qituvchilari"
          : direction.institution === "orta-maxsus"
            ? "O'rta maxsus ta'lim o'qituvchilari"
            : "Oliy ta'lim professor-o'qituvchilari",
    lessonsCount: modules * 3,
    syllabus: Array.from({ length: modules }, (_, moduleIndex) => ({
      id: `${direction.id}-m${moduleIndex + 1}`,
      title: `Modul ${moduleIndex + 1}: ${moduleIndex === 0 ? "Nazariy asoslar" : "Amaliy mashg'ulotlar"}`,
      lessons: [
        {
          id: `${direction.id}-m${moduleIndex + 1}-l1`,
          title: moduleIndex === 0 ? "Kirish darsi" : `${direction.title} mashg'uloti`,
          duration: "45 daqiqa",
        },
        {
          id: `${direction.id}-m${moduleIndex + 1}-l2`,
          title: `${direction.title} metodikasi`,
          duration: "50 daqiqa",
        },
        {
          id: `${direction.id}-m${moduleIndex + 1}-l3`,
          title: "Amaliy dars",
          duration: "60 daqiqa",
        },
      ],
    })),
  };
}

export const educationCourses: CourseCatalogItem[] = educationDirections.map(makeCourse);

function slugifyDirection(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[ʼ‘’`'ʻ]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "") || "yunalish"
  );
}

function listedModules(item: QualificationDirection): QualificationModule[] {
  return (item.modules ?? [])
    .filter((module) => Number(module.id) > 0 && isModuleListedForStudent(module.status))
    .slice()
    .sort((a, b) => (a.module_number ?? 0) - (b.module_number ?? 0));
}

export function publishedTreeForTitle(published: QualificationDirection[], title: string) {
  const match = matchPublishedDirectionByTitle(published, title);
  if (!match || !isVisibleToStudent(match.status)) {
    return { hours: 0, modules: [] as QualificationModule[] };
  }
  return { hours: match.duration_hours ?? 0, modules: listedModules(match) };
}

/** Admin nashr qilgan modullarni mahalliy katalog kartasiga yozadi (soxta 8 ta o'rniga). */
export function overlayEducationCourseWithPublished(
  course: CourseCatalogItem,
  published: QualificationDirection[] = []
): CourseCatalogItem {
  const match = matchPublishedDirectionByTitle(published, course.title);
  if (!match || !isVisibleToStudent(match.status)) return course;
  const modules = listedModules(match);
  if (!modules.length) return course;
  const syllabus = modules.map((module) => ({
    id: String(module.id),
    title: module.title,
    lessons: (module.lessons ?? [])
      .filter((lesson) => Number(lesson.id) > 0 && isLessonListedForStudent(lesson.status))
      .map((lesson) => ({
        id: String(lesson.id),
        title: lesson.title,
        duration: "",
      })),
  }));
  return {
    ...course,
    hours: match.duration_hours || course.hours,
    duration: match.duration_hours ? `${match.duration_hours} soat` : course.duration,
    modulesCount: syllabus.length,
    lessonsCount: syllabus.reduce((sum, module) => sum + module.lessons.length, 0),
    syllabus,
  };
}

export function mergeOliyEducationCourses(published: QualificationDirection[] = []): CourseCatalogItem[] {
  const base = getEducationCourses("oliy").map((course) =>
    overlayEducationCourseWithPublished(course, published)
  );
  const baseKeys = new Set(base.map((course) => canonicalDirectionTitleKey(course.title)));
  const extras: CourseCatalogItem[] = [];
  const seen = new Set<string>();

  published.forEach((item, index) => {
    if (!(item.id > 0) || !isVisibleToStudent(item.status)) return;
    const key = canonicalDirectionTitleKey(item.title);
    if (!key || baseKeys.has(key) || seen.has(key)) return;
    seen.add(key);
    extras.push(
      overlayEducationCourseWithPublished(
        makeCourse(
          {
            id: `oliy-${item.itId ?? item.id}-${slugifyDirection(item.title)}`,
            institution: "oliy",
            title: item.title,
            description: item.description || `${item.title} yo'nalishida malaka oshirish.`,
            imageGradient: gradients[index % gradients.length],
          },
          base.length + extras.length
        ),
        published
      )
    );
  });

  return [...base, ...extras];
}

export function getDirectionsByInstitution(institution: InstitutionType | "all") {
  if (institution === "all") return educationDirections;
  return educationDirections.filter((item) => item.institution === institution);
}

export function getEducationCourses(institution: InstitutionType | "all") {
  if (institution === "all") return educationCourses;
  return educationCourses.filter((course) => course.institution === institution);
}

export function getEducationCourseById(id: string) {
  const snapshot = readQualificationSnapshotLocal();
  const local =
    educationCourses.find((course) => course.id === id) ??
    mergeOliyEducationCourses(snapshot).find((course) => course.id === id);
  return local ? overlayEducationCourseWithPublished(local, snapshot) : undefined;
}

export function getDirectionById(id: string) {
  return educationDirections.find((item) => item.id === id);
}

export function isLocalEducationCourseId(id: string) {
  return (
    id.startsWith("course-maktabgacha-") ||
    id.startsWith("course-umumtalim-") ||
    id.startsWith("course-orta-maxsus-") ||
    id.startsWith("course-oliy-") ||
    id.startsWith("course-maktab-") ||
    id.startsWith("course-kollej-") ||
    id.startsWith("course-universitet-")
  );
}
