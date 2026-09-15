/** Student dasturlarining backend prefikslari. Malaka — mavjud /learning; qayta tayyorlash — /retraining/*. */

import { ApiError } from "@/lib/api/errors";
import type { RetrainingType } from "@/lib/retraining/kind";

export const LEARNING_API_PREFIX = {
  malaka: "/learning",
  retraining: "/retraining/learning",
} as const;

export const NOTIFICATIONS_API_PREFIX = {
  malaka: "/notifications",
  retraining: "/retraining/notifications",
} as const;

export const COURSES_API_PREFIX = {
  malaka: "/courses",
  retraining: "/retraining/courses",
} as const;

export const APPLICATIONS_API_PREFIX = {
  malaka: "/applications",
  retraining: "/retraining/applications",
} as const;

export type LearningApiPrefix = (typeof LEARNING_API_PREFIX)[keyof typeof LEARNING_API_PREFIX];
export type NotificationsApiPrefix = (typeof NOTIFICATIONS_API_PREFIX)[keyof typeof NOTIFICATIONS_API_PREFIX];

export function learningApiPath(prefix: string, rest: string, retrainingType?: RetrainingType | null) {
  const base = (prefix || LEARNING_API_PREFIX.malaka).replace(/\/$/, "");
  const path = `${base}${rest.startsWith("/") ? rest : `/${rest}`}`;
  if (base.includes("/retraining/") && !retrainingType) {
    throw new ApiError(400, "Qayta tayyorlash turi tanlanmagan");
  }
  return path;
}

export function notificationsApiPath(prefix: string, rest = "", _retrainingType?: RetrainingType | null) {
  const base = (prefix || NOTIFICATIONS_API_PREFIX.malaka).replace(/\/$/, "");
  if (rest) {
    if (rest.startsWith("?")) return `${base}${rest}`;
    return `${base}${rest.startsWith("/") ? rest : `/${rest}`}`;
  }
  return base;
}
