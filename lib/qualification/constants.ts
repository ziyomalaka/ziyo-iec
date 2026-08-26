import type { QualificationLessonType, QualificationMaterialType } from "@/lib/api/types/qualification";

export const QUALIFICATION_WIZARD_DRAFT_KEY = "qualification-material-wizard-draft";

export const WIZARD_STEPS = [
  { id: 1, label: "Yo'nalish" },
  { id: 2, label: "Modul" },
  { id: 3, label: "Dars" },
  { id: 4, label: "Material" },
  { id: 5, label: "Yuklash" },
  { id: 6, label: "Tekshirish" },
  { id: 7, label: "Nashr" },
] as const;

export const LESSON_TYPE_OPTIONS = [
  { label: "Nazariy", value: "THEORY" },
  { label: "Amaliy", value: "PRACTICAL" },
] as const satisfies { label: string; value: QualificationLessonType }[];

export const MATERIAL_TYPE_OPTIONS = [
  { label: "Video", value: "VIDEO", hint: "Dars videosi" },
  { label: "Taqdimot", value: "PRESENTATION", hint: "Taqdimot fayli" },
  { label: "Ma'ruza matni", value: "GUIDE", hint: "Ma'ruza matni va fayl" },
  { label: "Seminar", value: "SEMINAR", hint: "Topshiriq va ko'rsatma" },
  { label: "Laboratoriya", value: "LABORATORY", hint: "Amaliy ish" },
  { label: "Test", value: "TEST", hint: "Savollar va baholash" },
] as const satisfies { label: string; value: QualificationMaterialType; hint: string }[];

/** Backend accepts any file format; only size is limited. */
export const MAX_FILE_SIZE = 200 * 1024 * 1024;

export function materialTypeLabel(type: QualificationMaterialType) {
  return MATERIAL_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export function lessonTypeLabel(type: QualificationLessonType) {
  return LESSON_TYPE_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

export function formatLessonCode(moduleNumber: number | null, lessonNumber: number | null) {
  if (!moduleNumber || !lessonNumber) return "";
  return `${moduleNumber}.${lessonNumber}`;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export function formatDuration(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export function defaultMaterialTitle(type: QualificationMaterialType, lessonCode: string) {
  const code = lessonCode || "1.1";
  switch (type) {
    case "VIDEO":
      return `Dars ${code} video`;
    case "PRESENTATION":
      return `Dars ${code} taqdimoti`;
    case "GUIDE":
      return `Dars ${code} ma'ruza matni`;
    case "SEMINAR":
      return `Dars ${code} seminari`;
    case "LABORATORY":
      return `Dars ${code} laboratoriyasi`;
    case "TEST":
      return `Dars ${code} testi`;
  }
}
