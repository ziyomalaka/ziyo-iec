import { ApiError } from "@/lib/api/errors";
import { backendRetrainingTypeParam } from "@/lib/retraining/backend-type";
import { normalizeRetrainingType, type RetrainingType } from "@/lib/retraining/kind";

export function requireBackendRetrainingType(value?: string | null): string {
  const type = backendRetrainingTypeParam(value);
  if (!type) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  return type;
}

export function requireStudentRetrainingType(value?: string | null): RetrainingType {
  const type = normalizeRetrainingType(value);
  if (!type) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  return type;
}

/** Itemda type bo'lmasa so'rov scopiga ishonamiz; type boshqa panelniki bo'lsa tashlaymiz. */
export function belongsToRetrainingType(itemType: unknown, expected?: string | null): boolean {
  const want = normalizeRetrainingType(expected);
  if (!want) return false;
  const got = normalizeRetrainingType(typeof itemType === "string" ? itemType : null);
  if (!got) return true;
  return got === want;
}

export function filterByRetrainingType<T>(
  items: T[],
  expected: string | null | undefined,
  readType: (item: T) => unknown
): T[] {
  return items.filter((item) => belongsToRetrainingType(readType(item), expected));
}
