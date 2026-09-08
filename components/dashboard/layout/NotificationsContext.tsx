"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Notification } from "@/lib/dashboard/types";
import {
  applyNotificationMutation,
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationErrorMessage,
  NOTIFICATIONS_PER_PAGE,
  type NotificationListState,
} from "@/lib/api/notifications";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

type NotificationsContextValue = {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  listError: string | null;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  removeAll: () => void;
  refresh: () => Promise<void>;
  reload: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const EMPTY: NotificationListState = {
  items: [],
  unread: 0,
  page: 1,
  per_page: NOTIFICATIONS_PER_PAGE,
  total: 0,
  total_pages: 1,
};

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { notificationsApi } = useStudentProgramPaths();
  const [state, setState] = useState<NotificationListState>(EMPTY);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const inflightRead = useRef(new Set<string>());
  const inflightAll = useRef(false);
  const inflightDelete = useRef(new Set<string>());
  const inflightClear = useRef(false);
  const requestSeq = useRef(0);

  const refresh = useCallback(async (silent = false, nextPage = page) => {
    const seq = ++requestSeq.current;
    if (!silent) setLoading(true);
    try {
      const [listResult, countResult] = await Promise.allSettled([
        getNotifications({ page: nextPage, per_page: NOTIFICATIONS_PER_PAGE }, notificationsApi),
        getUnreadCount(notificationsApi),
      ]);
      if (seq !== requestSeq.current) return;

      if (listResult.status === "fulfilled") {
        const list = listResult.value;
        const unread =
          countResult.status === "fulfilled" ? countResult.value : list.unread;
        setState({ ...list, unread });
        setListError(null);
      } else {
        if (!silent) {
          setListError(studentApiErrorMessage(listResult.reason, "generic"));
        }
        if (countResult.status === "fulfilled") {
          setState((prev) => ({ ...prev, unread: countResult.value }));
        }
      }
    } catch (caught) {
      if (seq !== requestSeq.current) return;
      if (!silent) setListError(studentApiErrorMessage(caught, "generic"));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [page, notificationsApi]);

  useEffect(() => {
    void refresh(false, page);
  }, [refresh, page]);

  useLiveRefresh(() => void refresh(true));

  const syncUnread = useCallback(async () => {
    try {
      const unread = await getUnreadCount(notificationsApi);
      setState((prev) => ({ ...prev, unread }));
    } catch {
      setState((prev) => ({
        ...prev,
        unread: prev.items.filter((item) => !item.read).length,
      }));
    }
  }, [notificationsApi]);

  const markRead = useCallback(async (id: string) => {
    if (inflightRead.current.has(id)) return;
    inflightRead.current.add(id);
    setState((prev) => applyNotificationMutation(prev, { id, read: true }));
    try {
      const payload = await markNotificationRead(id, notificationsApi);
      setState((prev) => applyNotificationMutation(prev, payload ?? { id, read: true }));
      await syncUnread();
    } catch (err) {
      toast.error(notificationErrorMessage(err, "O'qilgan qilib bo'lmadi"));
      void refresh(true);
    } finally {
      inflightRead.current.delete(id);
    }
  }, [refresh, syncUnread, notificationsApi]);

  const markAllRead = useCallback(async () => {
    if (inflightAll.current) return;
    inflightAll.current = true;
    setState((prev) => applyNotificationMutation(prev, { unread: 0 }));
    try {
      const payload = await markAllNotificationsRead(notificationsApi);
      setState((prev) => applyNotificationMutation(prev, payload ?? { unread: 0 }));
      await syncUnread();
      toast.success("Barcha bildirishnomalar o'qilgan deb belgilandi.");
    } catch (err) {
      toast.error(notificationErrorMessage(err, "Barchasini o'qilgan qilib bo'lmadi"));
      void refresh(true);
    } finally {
      inflightAll.current = false;
    }
  }, [refresh, syncUnread, notificationsApi]);

  const remove = useCallback(async (id: string) => {
    if (inflightDelete.current.has(id)) return;
    inflightDelete.current.add(id);
    setState((prev) => applyNotificationMutation(prev, { deleted: true, id }));
    try {
      const payload = await deleteNotification(id, notificationsApi);
      setState((prev) => applyNotificationMutation(prev, payload ?? { deleted: true, id }));
      await syncUnread();
      toast.success("Xabar o'chirildi.");
    } catch (err) {
      toast.error(notificationErrorMessage(err, "O'chirib bo'lmadi"));
      void refresh(true);
    } finally {
      inflightDelete.current.delete(id);
    }
  }, [refresh, syncUnread, notificationsApi]);

  const removeAll = useCallback(async () => {
    if (inflightClear.current) return;
    inflightClear.current = true;
    setState((prev) => ({
      ...prev,
      items: [],
      unread: 0,
      total: 0,
      total_pages: 1,
    }));
    try {
      await deleteAllNotifications(notificationsApi);
      await syncUnread();
      toast.success("Barcha xabarlar o'chirildi.");
    } catch (err) {
      toast.error(notificationErrorMessage(err, "Barchasini o'chirib bo'lmadi"));
      void refresh(true);
    } finally {
      inflightClear.current = false;
    }
  }, [refresh, syncUnread, notificationsApi]);

  const silentRefresh = useCallback(() => refresh(true), [refresh]);
  const reload = useCallback(() => refresh(false), [refresh]);

  const value = useMemo(
    () => ({
      items: state.items,
      unreadCount: state.unread,
      loading,
      listError,
      page,
      totalPages: state.total_pages,
      setPage,
      markRead: (id: string) => void markRead(id),
      markAllRead: () => void markAllRead(),
      remove: (id: string) => void remove(id),
      removeAll: () => void removeAll(),
      refresh: silentRefresh,
      reload,
    }),
    [state, loading, listError, page, markRead, markAllRead, remove, removeAll, silentRefresh, reload]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      items: [] as Notification[],
      unreadCount: 0,
      loading: false,
      listError: null as string | null,
      page: 1,
      totalPages: 1,
      setPage: () => undefined,
      markRead: () => undefined,
      markAllRead: () => undefined,
      remove: () => undefined,
      removeAll: () => undefined,
      refresh: async () => undefined,
      reload: async () => undefined,
    };
  }
  return ctx;
}
