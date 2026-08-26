/**
 * Bildirishnomalar — Swagger /notifications
 *
 * GET    /notifications?page=&per_page=
 * GET    /notifications/unread-count
 * PUT    /notifications/{id}/read
 * PUT    /notifications/read-all
 * DELETE /notifications/{id}
 * DELETE /notifications
 * POST   /notifications/to-admin          { title, message }
 * POST   /admin/supervisor/notifications  { user_id, title, message }
 */

import { toQuery } from "@/lib/admin/query";
import { apiRequest } from "@/lib/api/client";
import { ApiError } from "@/lib/api/errors";
import { unwrapApiPayload } from "@/lib/api/unwrap";
import type { Notification } from "@/lib/dashboard/types";

export const NOTIFICATIONS_PER_PAGE = 20;

export type CreateNotificationPayload = {
  user_id: number;
  title: string;
  message: string;
};

export type SendToAdminPayload = {
  title: string;
  message: string;
};

export type NotificationListState = {
  items: Notification[];
  unread: number;
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

const CREATE_PATH = "/admin/supervisor/notifications";

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function parseNonNegativeInt(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(n) || n < 0) return undefined;
  return n;
}

function asBool(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return undefined;
}

function pickText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function asCategory(value: unknown): Notification["category"] {
  const raw = String(value ?? "").toLowerCase();
  if (
    raw.includes("course") ||
    raw.includes("lesson") ||
    raw.includes("dars") ||
    raw.includes("modul") ||
    raw === "courses"
  ) {
    return "courses";
  }
  if (raw.includes("test") || raw.includes("exam") || raw === "tests") {
    return "tests";
  }
  return "system";
}

function entityId(row: Record<string, unknown>): string | null {
  const raw =
    row.id ??
    row.ID ??
    row.Id ??
    row.notification_id ??
    row.notificationId ??
    row.uuid ??
    row.UUID;
  if (raw == null || raw === "") return null;
  const id = String(raw).trim();
  return id || null;
}

function isReadFromRow(src: Record<string, unknown>): boolean {
  const readFlag =
    asBool(src.read) ?? asBool(src.is_read) ?? asBool(src.isRead);
  if (readFlag != null) return readFlag;

  const unreadFlag = asBool(src.unread);
  if (unreadFlag != null) return !unreadFlag;

  if (pickText(src.read_at, src.readAt, src.seen_at, src.seenAt)) return true;

  const status = String(src.status ?? "").toLowerCase();
  if (status === "read" || status === "seen" || status === "opened") return true;
  if (status === "unread" || status === "new" || status === "sent") return false;

  return false;
}

function pickSender(src: Record<string, unknown>): { senderId?: number; senderName?: string } {
  const senderId =
    parseNonNegativeInt(src.sender_id) ??
    parseNonNegativeInt(src.senderId) ??
    parseNonNegativeInt(src.admin_id) ??
    parseNonNegativeInt(src.from_id);
  const senderName = pickText(
    src.sender_name,
    src.senderName,
    src.from_name,
    src.admin_name,
    src.full_name,
    src.fullName,
    src.user_name,
    src.userName,
    src.email,
    src.from_email
  );
  return {
    senderId,
    senderName: senderName || (senderId != null ? `Mijoz #${senderId}` : undefined),
  };
}

export function asNotification(item: unknown): Notification | null {
  const row = asRecord(item);
  const nested = asRecord(row.notification);
  const src = Object.keys(nested).length ? { ...row, ...nested } : row;
  const id = entityId(src);
  if (!id) return null;

  const { senderId, senderName } = pickSender(src);
  const fromAdmin =
    senderId == null ||
    senderId > 0 ||
    Boolean(senderName) ||
    String(src.source ?? src.origin ?? src.from ?? "").toLowerCase().includes("admin") ||
    String(src.source ?? src.origin ?? src.from ?? "").toLowerCase().includes("supervisor") ||
    String(src.source ?? src.origin ?? src.from ?? "").toLowerCase().includes("nazorat");

  return {
    id,
    title: pickText(src.title, src.subject, src.heading) || "Bildirishnoma",
    text: pickText(src.text, src.body, src.message, src.content, src.description),
    date: pickText(src.date, src.created_at, src.createdAt, src.sent_at) || new Date().toISOString(),
    read: isReadFromRow(src),
    category: asCategory(src.category ?? src.type ?? src.kind),
    senderId,
    senderName,
    fromAdmin,
  };
}

function pickUnread(row: Record<string, unknown>): number | undefined {
  return (
    parseNonNegativeInt(row.unread) ??
    parseNonNegativeInt(row.unread_count) ??
    parseNonNegativeInt(row.unreadCount) ??
    parseNonNegativeInt(row.unread_total)
  );
}

function derivedUnread(items: Notification[]): number {
  return items.filter((n) => !n.read).length;
}

const LIST_KEYS = [
  "items",
  "Items",
  "notifications",
  "Notifications",
  "results",
  "records",
  "rows",
  "list",
] as const;

function asItemArray(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const vals = Object.values(value as Record<string, unknown>);
    if (vals.length && vals.every((item) => item && typeof item === "object")) {
      return vals;
    }
  }
  return null;
}

function extractListIfPresent(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  const obj = asRecord(raw);
  const found: unknown[][] = [];

  const push = (value: unknown) => {
    const list = asItemArray(value);
    if (list) found.push(list);
  };

  for (const key of LIST_KEYS) push(obj[key]);
  push(obj.data);
  push(obj.result);
  push(obj.payload);

  const nested = asRecord(obj.data);
  for (const key of LIST_KEYS) push(nested[key]);
  const nestedResult = asRecord(obj.result);
  for (const key of LIST_KEYS) push(nestedResult[key]);

  const nonEmpty = found.find((list) => list.length > 0);
  if (nonEmpty) return nonEmpty;
  return found[0] ?? null;
}

function paginationFrom(
  row: Record<string, unknown>,
  items: Notification[],
  fallback: { page: number; per_page: number }
): Pick<NotificationListState, "page" | "per_page" | "total" | "total_pages"> {
  const page = parseNonNegativeInt(row.page) ?? fallback.page;
  const per_page =
    parseNonNegativeInt(row.per_page) ??
    parseNonNegativeInt(row.perPage) ??
    fallback.per_page;
  const reportedTotal =
    parseNonNegativeInt(row.total) ??
    parseNonNegativeInt(row.total_count);
  const reportedPages =
    parseNonNegativeInt(row.total_pages) ?? parseNonNegativeInt(row.totalPages);

  const total = reportedTotal ?? (page - 1) * per_page + items.length;
  let total_pages = reportedPages;
  if (total_pages == null) {
    if (reportedTotal != null && per_page > 0) {
      total_pages = Math.max(1, Math.ceil(reportedTotal / per_page));
    } else if (items.length >= per_page) {
      total_pages = page + 1;
    } else {
      total_pages = Math.max(1, page);
    }
  }

  return { page, per_page, total, total_pages: Math.max(1, total_pages) };
}

function mapListItems(listRaw: unknown[]): Notification[] {
  return listRaw
    .map((item, index) => {
      const mapped = asNotification(item);
      if (mapped) return mapped;
      const row = asRecord(item);
      const nested = asRecord(row.notification);
      const src = Object.keys(nested).length ? { ...row, ...nested } : row;
      const title = pickText(src.title, src.subject, src.heading);
      const text = pickText(src.text, src.body, src.message, src.content, src.description);
      if (!title && !text) return null;
      const { senderId, senderName } = pickSender(src);
      return {
        id: `tmp-${index}-${pickText(src.created_at, src.createdAt, src.sent_at, title, text).slice(0, 40)}`,
        title: title || "Bildirishnoma",
        text,
        date: pickText(src.date, src.created_at, src.createdAt, src.sent_at) || new Date().toISOString(),
        read: isReadFromRow(src),
        category: asCategory(src.category ?? src.type ?? src.kind),
        senderId,
        senderName,
        fromAdmin: senderId == null || senderId > 0 || Boolean(senderName),
      } satisfies Notification;
    })
    .filter((item): item is Notification => item !== null);
}

export function parseNotificationList(
  raw: unknown,
  fallback: { page: number; per_page: number } = { page: 1, per_page: NOTIFICATIONS_PER_PAGE }
): NotificationListState {
  const payload = unwrapApiPayload(raw);
  const row = asRecord(payload);
  const nested = asRecord(row.data);
  const src = Object.keys(nested).length ? { ...row, ...nested } : row;
  const listRaw = extractListIfPresent(payload) ?? extractListIfPresent(src) ?? [];
  const items = mapListItems(listRaw);
  const unread = pickUnread(src) ?? pickUnread(nested) ?? pickUnread(row) ?? derivedUnread(items);
  return {
    items,
    unread,
    ...paginationFrom(Object.keys(nested).length ? { ...row, ...nested } : src, items, fallback),
  };
}

export function parseSendToAdminResponse(raw: unknown): { count: number; items: Notification[] } {
  const parsed = parseNotificationList(raw);
  const row = asRecord(unwrapApiPayload(raw));
  const nested = asRecord(row.data);
  const count =
    parseNonNegativeInt(row.count) ??
    parseNonNegativeInt(nested.count) ??
    parsed.items.length;
  return { count: count ?? parsed.items.length, items: parsed.items };
}

export function parseUnreadCount(raw: unknown): number {
  const payload = unwrapApiPayload(raw);
  if (typeof payload === "number") return parseNonNegativeInt(payload) ?? 0;
  const row = asRecord(payload);
  const nested = asRecord(row.data);
  return (
    pickUnread(row) ??
    pickUnread(nested) ??
    parseNonNegativeInt(row.count) ??
    parseNonNegativeInt(nested.count) ??
    0
  );
}

/**
 * Mutation javobini mavjud listga qo'llaydi:
 * - DELETE { deleted: true, id } → olib tashlash
 * - bitta obyekt → id bo'yicha update (yoki qo'shish)
 * - { unread: 0 } → badge
 * - array / items → listni almashtirish
 */
export function applyNotificationMutation(
  prev: NotificationListState,
  raw: unknown
): NotificationListState {
  const payload = unwrapApiPayload(raw);
  const row = asRecord(payload);
  const unreadFromPayload = pickUnread(row);

  const deleted =
    asBool(row.deleted) === true ||
    String(row.status ?? "").toLowerCase() === "deleted";
  const deletedId = entityId(row);
  if (deleted && deletedId) {
    const items = prev.items.filter((n) => n.id !== deletedId);
    return {
      ...prev,
      items,
      unread: unreadFromPayload ?? derivedUnread(items),
    };
  }

  const listRaw = extractListIfPresent(payload);
  if (listRaw) {
    const parsed = parseNotificationList(payload, {
      page: prev.page,
      per_page: prev.per_page,
    });
    return {
      ...parsed,
      unread: unreadFromPayload ?? parsed.unread,
    };
  }

  const mapped = asNotification(row);
  if (mapped) {
    const prevItem = prev.items.find((n) => n.id === mapped.id);
    const items = prevItem
      ? prev.items.map((n) => {
          if (n.id !== mapped.id) return n;
          return {
            ...n,
            read: mapped.read,
            title: pickText(row.title, row.subject, row.heading) ? mapped.title : n.title,
            text: pickText(row.text, row.body, row.message, row.content, row.description)
              ? mapped.text
              : n.text,
            date: pickText(row.date, row.created_at, row.createdAt, row.sent_at)
              ? mapped.date
              : n.date,
            category:
              row.category != null || row.type != null || row.kind != null
                ? mapped.category
                : n.category,
          };
        })
      : [mapped, ...prev.items];

    let unread = unreadFromPayload;
    if (unread == null) {
      if (prevItem) {
        if (!prevItem.read && mapped.read) unread = Math.max(0, prev.unread - 1);
        else if (prevItem.read && !mapped.read) unread = prev.unread + 1;
        else unread = prev.unread;
      } else {
        unread = mapped.read ? prev.unread : prev.unread + 1;
      }
    }

    return {
      ...prev,
      items,
      unread,
    };
  }

  if (unreadFromPayload != null) {
    return {
      ...prev,
      items: unreadFromPayload === 0 ? prev.items.map((n) => ({ ...n, read: true })) : prev.items,
      unread: unreadFromPayload,
    };
  }

  return prev;
}

export function notificationErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }

  switch (error.status) {
    case 400:
      return "Noto'g'ri ma'lumot";
    case 401:
      return "Login kerak";
    case 403:
      return "Ruxsat yo'q";
    case 404:
      return "Notification topilmadi";
    case 500:
      return "Server xatosi";
    case 502:
    case 503:
      return "Backend/server vaqtincha ishlamayapti";
    default:
      return error.message || fallback;
  }
}

export async function getNotifications(params: {
  page?: number;
  per_page?: number;
} = {}): Promise<NotificationListState> {
  const page = params.page ?? 1;
  const per_page = params.per_page ?? NOTIFICATIONS_PER_PAGE;
  const data = await apiRequest<unknown>(
    `/notifications${toQuery({ page, per_page })}`
  );
  return parseNotificationList(data, { page, per_page });
}

export async function getUnreadCount(): Promise<number> {
  const data = await apiRequest<unknown>("/notifications/unread-count");
  return parseUnreadCount(data);
}

export async function markNotificationRead(id: string): Promise<unknown> {
  return apiRequest<unknown>(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "PUT",
  });
}

export async function markAllNotificationsRead(): Promise<unknown> {
  return apiRequest<unknown>("/notifications/read-all", {
    method: "PUT",
  });
}

export async function deleteNotification(id: string): Promise<unknown> {
  return apiRequest<unknown>(`/notifications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function deleteAllNotifications(): Promise<unknown> {
  return apiRequest<unknown>("/notifications", {
    method: "DELETE",
  });
}

export async function createNotification(
  payload: CreateNotificationPayload
): Promise<unknown> {
  return apiRequest<unknown>(CREATE_PATH, {
    method: "POST",
    body: JSON.stringify({
      user_id: payload.user_id,
      title: payload.title,
      message: payload.message,
    }),
  });
}

export async function sendNotificationToAdmin(
  payload: SendToAdminPayload
): Promise<{ count: number; items: Notification[] }> {
  const data = await apiRequest<unknown>("/notifications/to-admin", {
    method: "POST",
    body: JSON.stringify({
      title: payload.title,
      message: payload.message,
    }),
  });
  return parseSendToAdminResponse(data);
}

export function formatToAdminMessage(message: string, user: {
  first_name?: string | null;
  last_name?: string | null;
  father_name?: string | null;
  email?: string | null;
  nickname?: string | null;
} | null) {
  const name = [user?.first_name, user?.last_name, user?.father_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const email = user?.email?.trim() ?? "";
  const who = [name || user?.nickname?.trim(), email].filter(Boolean).join(" · ");
  if (!who) return message;
  return `Kimdan: ${who}\n\n${message}`;
}
