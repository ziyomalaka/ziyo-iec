import type { RetrainingType } from "@/lib/retraining/kind";

export type RetrainingApiScope = {
  retrainingType?: RetrainingType | string | null;
};

/** Client retraining API — type query EMAS; backend currentUser.retraining_type bo'yicha filter qiladi. */
export function withRetrainingScope(path: string, _scope?: RetrainingApiScope) {
  return path;
}

export function courseQueryWithType(
  query: Record<string, unknown> = {},
  _scope?: RetrainingApiScope
) {
  const next = { ...query };
  delete next.retraining_type;
  return next;
}
