/** Student dasturlarining backend prefikslari. Malaka — mavjud /learning; qayta tayyorlash — /retraining/*. */

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

export function learningApiPath(prefix: string, rest: string) {
  const base = (prefix || LEARNING_API_PREFIX.malaka).replace(/\/$/, "");
  return `${base}${rest.startsWith("/") ? rest : `/${rest}`}`;
}

export function notificationsApiPath(prefix: string, rest = "") {
  const base = (prefix || NOTIFICATIONS_API_PREFIX.malaka).replace(/\/$/, "");
  if (!rest) return base;
  return `${base}${rest.startsWith("/") ? rest : `/${rest}`}`;
}
