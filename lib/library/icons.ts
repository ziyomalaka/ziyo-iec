import {
  BookMarked,
  BookOpen,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  LayoutGrid,
  NotebookPen,
  Presentation,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { normalizeLibraryCategory, normalizeLibraryFileType } from "@/lib/library/constants";

export const LIBRARY_CATEGORY_ICONS: Record<string, LucideIcon> = {
  BOOK: BookOpen,
  TEXTBOOK: GraduationCap,
  STUDY_GUIDE: NotebookPen,
  METHODICAL_GUIDE: BookMarked,
  REGULATORY: Scale,
};

export const LIBRARY_FILE_TYPE_ICONS: Record<string, LucideIcon> = {
  PDF: FileText,
  WORD: FileText,
  PRESENTATION: Presentation,
  XLS: FileSpreadsheet,
};

export function libraryCategoryIcon(category?: string | null): LucideIcon {
  const key = String(normalizeLibraryCategory(category) || "").toUpperCase();
  return LIBRARY_CATEGORY_ICONS[key] ?? BookOpen;
}

export function libraryFileTypeIcon(fileType?: string | null): LucideIcon {
  const key = String(normalizeLibraryFileType(fileType) || "").toUpperCase();
  return LIBRARY_FILE_TYPE_ICONS[key] ?? FileText;
}

export const LibraryAllIcon = LayoutGrid;
