import type { UserResponse } from "@/lib/api/types/auth";
import type { DashboardUser } from "./types";
import { mockUser, getFullName, getShortName } from "./mock/data";

export function mapAuthUserToDashboard(user: UserResponse | null): DashboardUser {
  if (!user) return mockUser;

  return {
    ...mockUser,
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    fatherName: user.father_name,
    email: user.email,
    phone: user.phone_number,
    role: ["user", "student", "o'quvchi", "o‘quvchi"].includes(user.role.toLowerCase())
      ? ""
      : user.role,
    avatarInitials: `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase(),
  };
}

export { getFullName, getShortName };

/** Backend often sends local Tashkent time with a trailing Z. Use the wall-clock, do not shift +5h. */
function wallClock(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!match) return null;
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    time: match[4] && match[5] ? `${match[4]}:${match[5]}` : null,
  };
}

export function formatDate(date: string) {
  const wall = wallClock(date);
  if (wall) return wall.date;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatUzDateTime(date: string) {
  const wall = wallClock(date);
  if (wall) {
    const [year, month, day] = wall.date.split("-");
    return wall.time ? `${day}.${month}.${year} ${wall.time}` : `${day}.${month}.${year}`;
  }
  const parsed = new Date(date.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return date;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tashkent",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}.${get("month")}.${get("year")} ${get("hour")}:${get("minute")}`;
}

export function formatDateTime(date: string) {
  const wall = wallClock(date);
  if (wall?.time) return `${wall.date} ${wall.time}`;
  const parsed = new Date(date.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(parsed);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

export function applicationEventAt(item: {
  status?: string;
  created_at?: string;
  updated_at?: string;
  approved_at?: string;
}) {
  const decided = item.status === "approved" || item.status === "rejected" || item.status === "archived";
  if (decided) return item.approved_at || item.updated_at || item.created_at;
  return item.created_at;
}

export function formatApplicationEvent(item: Parameters<typeof applicationEventAt>[0]) {
  const at = applicationEventAt(item);
  return at ? formatDateTime(at) : "—";
}
