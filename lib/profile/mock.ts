import type { ActivityLog, UserSession } from "./types";

export const mockSessions: UserSession[] = [
  {
    id: "sess-1",
    browser: "Chrome",
    device: "Windows",
    location: "Toshkent",
    lastActiveAt: "2025-05-12T15:30:00",
    isCurrent: true,
  },
];

export const mockActivityFallback: ActivityLog[] = [
  {
    id: 1,
    type: "login",
    title: "Tizimga kirildi",
    description: "Tizimga kirildi",
    createdAt: "2026-08-14T09:00:00Z",
  },
];
