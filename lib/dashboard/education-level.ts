import type { CourseCatalogItem, InstitutionType } from "@/lib/dashboard/types";

export type { InstitutionType };

export const educationLevels: InstitutionType[] = [
  "maktabgacha",
  "umumtalim",
  "orta-maxsus",
  "oliy",
];

export const educationLevelLabels: Record<InstitutionType | "all", string> = {
  all: "Barchasi",
  maktabgacha: "Maktabgacha",
  umumtalim: "Umumta'lim",
  "orta-maxsus": "O'rta maxsus",
  oliy: "Oliy ta'lim",
};

export const educationLevelTabs: { id: InstitutionType | "all"; label: string }[] = [
  { id: "all", label: educationLevelLabels.all },
  ...educationLevels.map((id) => ({ id, label: educationLevelLabels[id] })),
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[ʼ‘’`'ʻ]/g, "'")
    .replace(/o['ʻ]/g, "o")
    .replace(/g['ʻ]/g, "g")
    .replace(/[']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyEducationLevel(...parts: Array<string | number | undefined | null>): InstitutionType | undefined {
  const text = normalize(parts.filter((part) => part != null && String(part).trim()).join(" "));
  if (!text) return undefined;
  if (/(maktabgacha|preschool)/.test(text)) return "maktabgacha";
  if (/(orta maxsus|ortamaxsus|kollej|college|litsey|lyceum|texnikum)/.test(text)) return "orta-maxsus";
  if (/(oliy talim|\boliy\b|universitet|university|institut\b|akademiya)/.test(text)) return "oliy";
  if (/(umumtalim|umumiy orta|\bmaktab\b|school)/.test(text)) return "umumtalim";
  return undefined;
}

/** Backend category names (Maktab/Kollej/...) ni katalog tab matnlariga moslaydi. */
export function displayEducationCategoryName(...parts: Array<string | number | undefined | null>): string {
  const level = classifyEducationLevel(...parts);
  if (level) return educationLevelLabels[level];
  const first = parts.find((part) => part != null && String(part).trim());
  return first != null ? String(first).trim() : "";
}

export function courseEducationLevel(course: Pick<CourseCatalogItem, "institution" | "categoryName" | "courseType" | "direction" | "title">) {
  return (
    course.institution ??
    classifyEducationLevel(course.categoryName, course.courseType, course.direction, course.title)
  );
}

export function emptyEducationCounts(): Record<InstitutionType | "all", number> {
  return {
    all: 0,
    maktabgacha: 0,
    umumtalim: 0,
    "orta-maxsus": 0,
    oliy: 0,
  };
}

export function countEducationLevels(courses: CourseCatalogItem[]) {
  const counts = emptyEducationCounts();
  counts.all = courses.length;
  for (const course of courses) {
    const level = courseEducationLevel(course);
    if (level) counts[level] += 1;
  }
  return counts;
}
