export const LIBRARY_CATEGORIES = [
  { value: "BOOK", label: "Kitob" },
  { value: "TEXTBOOK", label: "Darslik" },
  { value: "STUDY_GUIDE", label: "O'quv qo'llanma" },
  { value: "METHODICAL_GUIDE", label: "Metodik qo'llanma" },
  { value: "REGULATORY", label: "Me'yoriy hujjat" },
] as const;

export const LIBRARY_FILE_TYPES = [
  { value: "PDF", label: "PDF" },
  { value: "WORD", label: "WORD" },
  { value: "PRESENTATION", label: "PRESENTATION" },
] as const;

export const LIBRARY_LANGUAGES = [
  { value: "UZ", label: "O'zbek" },
  { value: "RU", label: "Rus" },
] as const;

export const LIBRARY_STATUSES = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHED", label: "PUBLISHED" },
  { value: "INACTIVE", label: "INACTIVE" },
  { value: "ARCHIVED", label: "ARCHIVED" },
] as const;

export const LIBRARY_SORTS = [
  { value: "newest", label: "Yangilari" },
  { value: "oldest", label: "Eskilari" },
  { value: "title", label: "Nomi" },
  { value: "author", label: "Muallif" },
  { value: "order", label: "Tartib" },
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number]["value"];
export type LibraryFileType = (typeof LIBRARY_FILE_TYPES)[number]["value"];
export type LibraryLanguage = (typeof LIBRARY_LANGUAGES)[number]["value"];
export type LibraryStatus = (typeof LIBRARY_STATUSES)[number]["value"];
export type LibrarySort = (typeof LIBRARY_SORTS)[number]["value"];

export const LIBRARY_MATERIAL_EXTENSIONS = ["pdf", "doc", "docx", "ppt", "pptx"] as const;
export const LIBRARY_COVER_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
export const LIBRARY_DANGEROUS_EXTENSIONS = [
  "exe",
  "bat",
  "cmd",
  "com",
  "scr",
  "js",
  "mjs",
  "html",
  "htm",
  "php",
  "phtml",
  "asp",
  "aspx",
  "jsp",
  "sh",
  "ps1",
  "dll",
  "so",
  "jar",
  "py",
  "rb",
  "svg",
] as const;

export const LIBRARY_COVER_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
export const LIBRARY_MATERIAL_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export const LIBRARY_MAX_MATERIAL_SIZE = 200 * 1024 * 1024;
export const LIBRARY_MAX_COVER_SIZE = 10 * 1024 * 1024;

export const LIBRARY_PERMISSIONS = {
  read: "library.read",
  create: "library.create",
  update: "library.update",
  publish: "library.publish",
  delete: "library.delete",
} as const;

export function libraryCategoryLabel(value?: string | null) {
  const key = String(normalizeLibraryCategory(value) || "").toUpperCase();
  return LIBRARY_CATEGORIES.find((item) => item.value === key)?.label ?? value ?? "";
}

export function libraryLanguageLabel(value?: string | null) {
  const key = String(normalizeLibraryLanguage(value) || "").toUpperCase();
  return LIBRARY_LANGUAGES.find((item) => item.value === key)?.label ?? value ?? "";
}

export function libraryFileTypeLabel(value?: string | null) {
  const key = String(normalizeLibraryFileType(value) || "").toUpperCase();
  return LIBRARY_FILE_TYPES.find((item) => item.value === key)?.label ?? value ?? "";
}

export function fileExtensionOf(name?: string | null) {
  const value = (name ?? "").trim().toLowerCase();
  const dot = value.lastIndexOf(".");
  if (dot < 0 || dot === value.length - 1) return "";
  return value.slice(dot + 1);
}

export function isDangerousLibraryFile(name?: string | null) {
  const ext = fileExtensionOf(name);
  return LIBRARY_DANGEROUS_EXTENSIONS.includes(ext as (typeof LIBRARY_DANGEROUS_EXTENSIONS)[number]);
}

export function isAllowedLibraryMaterial(name?: string | null) {
  const ext = fileExtensionOf(name);
  return LIBRARY_MATERIAL_EXTENSIONS.includes(ext as (typeof LIBRARY_MATERIAL_EXTENSIONS)[number]);
}

export function isAllowedLibraryCover(name?: string | null) {
  const ext = fileExtensionOf(name);
  return LIBRARY_COVER_EXTENSIONS.includes(ext as (typeof LIBRARY_COVER_EXTENSIONS)[number]);
}

export function fileTypeFromName(name?: string | null): LibraryFileType | null {
  const ext = fileExtensionOf(name);
  if (ext === "pdf") return "PDF";
  if (ext === "doc" || ext === "docx") return "WORD";
  if (ext === "ppt" || ext === "pptx") return "PRESENTATION";
  return null;
}

function compactKey(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

const CATEGORY_ALIASES: Record<string, LibraryCategory> = {
  book: "BOOK",
  kitob: "BOOK",
  books: "BOOK",
  textbook: "TEXTBOOK",
  darslik: "TEXTBOOK",
  studyguide: "STUDY_GUIDE",
  study_guide: "STUDY_GUIDE",
  guide: "STUDY_GUIDE",
  oquvqollanma: "STUDY_GUIDE",
  qollanma: "STUDY_GUIDE",
  methodicalguide: "METHODICAL_GUIDE",
  methodical_guide: "METHODICAL_GUIDE",
  metodikqollanma: "METHODICAL_GUIDE",
  metodik: "METHODICAL_GUIDE",
  regulatory: "REGULATORY",
  meyori: "REGULATORY",
  meyoriyhujjat: "REGULATORY",
  hujjat: "REGULATORY",
  kitoblar: "BOOK",
  darsliklar: "TEXTBOOK",
};

const FILE_TYPE_ALIASES: Record<string, LibraryFileType> = {
  pdf: "PDF",
  word: "WORD",
  doc: "WORD",
  docx: "WORD",
  presentation: "PRESENTATION",
  ppt: "PRESENTATION",
  pptx: "PRESENTATION",
};

const LANGUAGE_ALIASES: Record<string, LibraryLanguage> = {
  uz: "UZ",
  uzb: "UZ",
  uzbek: "UZ",
  ozbek: "UZ",
  ru: "RU",
  rus: "RU",
  russian: "RU",
};

export function normalizeLibraryCategory(value?: string | null): LibraryCategory | string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase().replace(/-/g, "_");
  if (LIBRARY_CATEGORIES.some((item) => item.value === upper)) return upper;
  return CATEGORY_ALIASES[compactKey(raw)] ?? CATEGORY_ALIASES[upper.toLowerCase()] ?? upper;
}

export function normalizeLibraryFileType(value?: string | null): LibraryFileType | string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase().replace(/-/g, "_");
  if (LIBRARY_FILE_TYPES.some((item) => item.value === upper)) return upper;
  return FILE_TYPE_ALIASES[compactKey(raw)] ?? FILE_TYPE_ALIASES[upper.toLowerCase()] ?? upper;
}

export function normalizeLibraryLanguage(value?: string | null): LibraryLanguage | string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper === "UZB") return "UZ";
  if (upper === "RUS") return "RU";
  if (LIBRARY_LANGUAGES.some((item) => item.value === upper)) return upper;
  return LANGUAGE_ALIASES[compactKey(raw)] ?? LANGUAGE_ALIASES[upper.toLowerCase()] ?? upper;
}
