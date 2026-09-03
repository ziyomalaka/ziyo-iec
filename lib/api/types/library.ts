import type {
  LibraryCategory,
  LibraryFileType,
  LibraryLanguage,
  LibrarySort,
  LibraryStatus,
} from "@/lib/library/constants";

export type LibraryItem = {
  id: number;
  title: string;
  author: string;
  category: LibraryCategory | string;
  description: string;
  full_description: string;
  language: LibraryLanguage | string;
  file_type: LibraryFileType | string;
  file_id: number | null;
  file_url: string;
  cover_file_id: number | null;
  cover_url: string;
  publisher: string;
  isbn: string;
  published_year: number | null;
  pages: number | null;
  keywords: string;
  author_about: string;
  status: LibraryStatus | string;
  order_index: number;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
};

export type LibraryListQuery = {
  page?: number;
  per_page?: number;
  search?: string;
  category?: string;
  language?: string;
  file_type?: string;
  status?: string;
  sort?: LibrarySort | string;
};

export type LibraryWritePayload = {
  title: string;
  author: string;
  category: string;
  language: string;
  file_type: string;
  description?: string;
  full_description?: string;
  publisher?: string;
  isbn?: string;
  published_year?: number | null;
  pages?: number | null;
  keywords?: string;
  author_about?: string;
  order_index?: number | null;
  file_id?: number | null;
  file_url?: string;
  cover_file_id?: number | null;
  cover_url?: string;
  file?: File | null;
  cover?: File | null;
  status?: string;
};
