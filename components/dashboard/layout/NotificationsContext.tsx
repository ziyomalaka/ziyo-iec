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
import { isServiceUnavailableError } from "@/lib/api/errors";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { isRetrainingApiEnabled } from "@/lib/retraining/temp-state";
import {
  retrainingListNotifications,
  retrainingMarkAllNotificationsRead,
  retrainingMarkNotificationRead,
  retrainingRemoveAllNotifications,
  retrainingRemoveNotification,
} from "@/lib/retraining/service";

const UNAVAILABLE_BACKOFF_MS = 60_000;

type NotificationsContextValue = {
  items: Notification[];
  unreadCount: number | null;
  unreadAvailable: boolean;
  loading: boolean;
  listError: string | null;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  removeAll: () => Promise<void>;
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
  const { kind, retrainingKind, notificationsApi } = useStudentProgramPaths();
  const [state, setState] = useState<NotificationListState>(EMPTY);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [unreadAvailable, setUnreadAvailable] = useState(true);
  const inflightRead = useRef(new Set<string>());
  const inflightAll = useRef(false);
  const inflightDelete = useRef(new Set<string>());
  const inflightClear = useRef(false);
  const requestSeq = useRef(0);
  const inflightRefresh = useRef<Promise<void> | null>(null);
  const unavailableUntil = useRef(0);

  const refresh = useCallback(
    async (silent = false, nextPage = page, force = false) => {
      if (!force && silent && Date.now() < unavailableUntil.current) return;

      if (inflightRefresh.current) {
        if (silent) return inflightRefresh.current;
      }

      const run = async () => {
        const seq = ++requestSeq.current;
        if (!silent) setLoading(true);

        try {
          if (kind === "retraining" && !isRetrainingApiEnabled()) {
            const items = await retrainingListNotifications(retrainingKind);
            if (seq !== requestSeq.current) return;
            setState({
              items,
              unread: items.filter((item) => !item.read).length,
              page: 1,
              per_page: NOTIFICATIONS_PER_PAGE,
              total: items.length,
              total_pages: 1,
            });
            setListError(null);
            setUnreadAvailable(true);
            unavailableUntil.current = 0;
            return;
          }

          const retrainingType = kind === "retraining" ? retrainingKind : null;
          const [listResult, countResult] = await Promise.allSettled([
            getNotifications(
              { page: nextPage, per_page: NOTIFICATIONS_PER_PAGE },
              notificationsApi,
              retrainingType
            ),
            getUnreadCount(notificationsApi, retrainingType),
          ]);
          if (seq !== requestSeq.current) return;

          const listFailed = listResult.status === "rejected";
          const countFailed = countResult.status === "rejected";
          const serviceDown =
            (listFailed && isServiceUnavailableError(listResult.reason)) ||
            (countFailed && isServiceUnavailableError(countResult.reason));

          if (serviceDown) {
            unavailableUntil.current = Date.now() + UNAVAILABLE_BACKOFF_MS;
            setUnreadAvailable(false);
            if (!silent) {
              setListError(
                studentApiErrorMessage(
                  listFailed ? listResult.reason : countResult.reason,
                  "generic"
                )
              );
            }
            return;
          }

          unavailableUntil.current = 0;
          setUnreadAvailable(true);

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
              setUnreadAvailable(true);
            }
          }
        } catch (caught) {
          if (seq !== requestSeq.current) return;
          if (isServiceUnavailableError(caught)) {
            unavailableUntil.current = Date.now() + UNAVAILABLE_BACKOFF_MS;
            setUnreadAvailable(false);
            if (!silent) {
              setListError(studentApiErrorMessage(caught, "generic"));
            }
            return;
          }
          if (!silent) setListError(studentApiErrorMessage(caught, "generic"));
        } finally {
          if (seq === requestSeq.current) setLoading(false);
        }
      };

      inflightRefresh.current = run().finally(() => {
        inflightRefresh.current = null;
      });
      return inflightRefresh.current;
    },
    [kind, retrainingKind, page, notificationsApi]
  );

  useEffect(() => {
    void refresh(false, page, true);
    return () => {
      requestSeq.current += 1;
    };
  }, [refresh, page]);

  useLiveRefresh((reason) => {
    if (reason === "tick" && Date.now() < unavailableUntil.current) return;
    void refresh(true);
  });

  const mockRetraining = kind === "retraining" && !isRetrainingApiEnabled();

  const syncUnread = useCallback(async () => {
    if (mockRetraining) {
      setState((prev) => ({
        ...prev,
        unread: prev.items.filter((item) => !item.read).length,
      }));
      setUnreadAvailable(true);
      return;
    }
    try {
      const unread = await getUnreadCount(
        notificationsApi,
        kind === "retraining" ? retrainingKind : null
      );
      setState((prev) => ({ ...prev, unread }));
      setUnreadAvailable(true);
      unavailableUntil.current = 0;
    } catch (err) {
      if (isServiceUnavailableError(err)) {
        setUnreadAvailable(false);
        unavailableUntil.current = Date.now() + UNAVAILABLE_BACKOFF_MS;
        return;
      }
      setState((prev) => ({
        ...prev,
        unread: prev.items.filter((item) => !item.read).length,
      }));
      setUnreadAvailable(true);
    }
  }, [kind, mockRetraining, notificationsApi, retrainingKind]);

  const markRead = useCallback(
    async (id: string) => {
      if (inflightRead.current.has(id)) return;
      inflightRead.current.add(id);
      setState((prev) => applyNotificationMutation(prev, { id, read: true }));
      if (mockRetraining) {
        await retrainingMarkNotificationRead(id, retrainingKind);
        inflightRead.current.delete(id);
        return;
      }
      try {
        const payload = await markNotificationRead(
          id,
          notificationsApi,
          kind === "retraining" ? retrainingKind : null
        );
        setState((prev) => applyNotificationMutation(prev, payload ?? { id, read: true }));
        await syncUnread();
      } catch (err) {
        toast.error(notificationErrorMessage(err, "O'qilgan qilib bo'lmadi"));
        void refresh(true, page, true);
      } finally {
        inflightRead.current.delete(id);
      }
    },
    [kind, mockRetraining, refresh, retrainingKind, syncUnread, notificationsApi, page]
  );

  const markAllRead = useCallback(async () => {
    if (inflightAll.current) return;
    inflightAll.current = true;
    setState((prev) => applyNotificationMutation(prev, { unread: 0 }));
    if (mockRetraining) {
      await retrainingMarkAllNotificationsRead(retrainingKind);
      inflightAll.current = false;
      return;
    }
    try {
      const payload = await markAllNotificationsRead(
        notificationsApi,
        kind === "retraining" ? retrainingKind : null
      );
      setState((prev) => applyNotificationMutation(prev, payload ?? { unread: 0 }));
      await syncUnread();
      toast.success("Barcha bildirishnomalar o'qilgan deb belgilandi.");
    } catch (err) {
      toast.error(notificationErrorMessage(err, "Barchasini o'qilgan qilib bo'lmadi"));
      void refresh(true, page, true);
    } finally {
      inflightAll.current = false;
    }
  }, [kind, mockRetraining, refresh, retrainingKind, syncUnread, notificationsApi, page]);

  const remove = useCallback(
    async (id: string) => {
      if (inflightDelete.current.has(id)) return;
      inflightDelete.current.add(id);
      setState((prev) => applyNotificationMutation(prev, { deleted: true, id }));
      if (mockRetraining) {
        await retrainingRemoveNotification(id, retrainingKind);
        inflightDelete.current.delete(id);
        return;
      }
      try {
        const payload = await deleteNotification(
          id,
          notificationsApi,
          kind === "retraining" ? retrainingKind : null
        );
        setState((prev) => applyNotificationMutation(prev, payload ?? { deleted: true, id }));
        await syncUnread();
        toast.success("Xabar o'chirildi.");
      } catch (err) {
        toast.error(notificationErrorMessage(err, "O'chirib bo'lmadi"));
        void refresh(true, page, true);
      } finally {
        inflightDelete.current.delete(id);
      }
    },
    [kind, mockRetraining, refresh, retrainingKind, syncUnread, notificationsApi, page]
  );

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
    if (mockRetraining) {
      await retrainingRemoveAllNotifications(retrainingKind);
      inflightClear.current = false;
      return;
    }
    try {
      await deleteAllNotifications(
        notificationsApi,
        kind === "retraining" ? retrainingKind : null
      );
      await syncUnread();
      toast.success("Barcha xabarlar o'chirildi.");
    } catch (err) {
      toast.error(notificationErrorMessage(err, "Barchasini o'chirib bo'lmadi"));
      void refresh(true, page, true);
    } finally {
      inflightClear.current = false;
    }
  }, [kind, mockRetraining, refresh, retrainingKind, syncUnread, notificationsApi, page]);

  const silentRefresh = useCallback(() => refresh(true), [refresh]);
  const reload = useCallback(() => refresh(false, page, true), [refresh, page]);

  const value = useMemo(
    () => ({
      items: state.items,
      unreadCount: unreadAvailable ? state.unread : null,
      unreadAvailable,
      loading,
      listError,
      page,
      totalPages: state.total_pages,
      setPage,
      markRead: (id: string) => void markRead(id),
      markAllRead: () => void markAllRead(),
      remove: (id: string) => void remove(id),
      removeAll,
      refresh: silentRefresh,
      reload,
    }),
    [
      state,
      unreadAvailable,
      loading,
      listError,
      page,
      markRead,
      markAllRead,
      remove,
      removeAll,
      silentRefresh,
      reload,
    ]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    return {
      items: [] as Notification[],
      unreadCount: null as number | null,
      unreadAvailable: false,
      loading: false,
      listError: null as string | null,
      page: 1,
      totalPages: 1,
      setPage: () => undefined,
      markRead: () => undefined,
      markAllRead: () => undefined,
      remove: () => undefined,
      removeAll: async () => undefined,
      refresh: async () => undefined,
      reload: async () => undefined,
    };
  }
  return ctx;
}
