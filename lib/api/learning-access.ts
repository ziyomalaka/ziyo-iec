import { ApiError } from "@/lib/api/errors";

export function isLearnForbiddenError(error: unknown) {
  return error instanceof ApiError && error.status === 403;
}

/**
 * Majburiy blog / auto-enroll: birinchi 403 da backend enroll qilishi mumkin.
 * Darhol "ariza topshiring" deb qolmasdan bir marta qayta so'raymiz.
 */
export async function withLearningAccessRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (!isLearnForbiddenError(error)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 250));
    return await fn();
  }
}
