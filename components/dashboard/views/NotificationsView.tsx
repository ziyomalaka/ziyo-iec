"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Bell, MessageCircle } from "lucide-react";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DashboardTabs from "@/components/dashboard/ui/DashboardTabs";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import AdminPagination from "@/components/admin/AdminPagination";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { getAuthUser } from "@/lib/auth/session";
import {
  notificationErrorMessage,
  sendNotificationToAdmin,
} from "@/lib/api/notifications";
import {
  personInitials,
  studentStaffDisplayName,
  studentStaffRoleLabel,
} from "@/lib/dashboard/staff-public-label";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

const tabs = [
  { id: "all", label: "Barchasi" },
  { id: "unread", label: "O'qilmagan" },
  { id: "courses", label: "Kurslar" },
  { id: "tests", label: "Testlar" },
  { id: "system", label: "Tizim" },
];

function senderLabel() {
  const user = getAuthUser();
  const name = [user?.first_name, user?.last_name, user?.father_name].filter(Boolean).join(" ").trim();
  return [name || user?.nickname, user?.email].filter(Boolean).join(" · ") || "Siz";
}

export default function NotificationsView({
  emptyTitle = "Bildirishnoma yo'q",
  emptyDescription,
}: {
  emptyTitle?: string;
  emptyDescription?: string;
} = {}) {
  const { notificationsApi, retrainingKind } = useStudentProgramPaths();
  const allowContactAdmin = true;
  const [active, setActive] = useState("all");
  const [contactOpen, setContactOpen] = useState(false);
  const [title, setTitle] = useState("Murojaat");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const {
    items,
    unreadCount,
    unreadAvailable,
    loading,
    listError,
    page,
    totalPages,
    setPage,
    markRead,
    markAllRead,
    remove,
    reload,
  } = useNotifications();
  const staffName = studentStaffDisplayName(
    items.find((item) => item.fromAdmin || Boolean(item.senderName))?.senderName
  );

  const filtered = useMemo(() => {
    if (active === "all") return items;
    if (active === "unread") return items.filter((n) => !n.read);
    return items.filter((n) => n.category === active);
  }, [active, items]);

  const closeContact = () => {
    if (sending) return;
    setContactOpen(false);
  };

  const onContact = async (event: FormEvent) => {
    event.preventDefault();
    if (sending) return;
    const trimmedTitle = title.trim();
    const trimmedMessage = message.trim();
    if (!trimmedTitle || !trimmedMessage) {
      toast.error("Sarlavha va xabar to'ldirilishi shart");
      return;
    }
    setSending(true);
    try {
      const sent = await sendNotificationToAdmin(
        {
          title: trimmedTitle,
          message: trimmedMessage,
        },
        notificationsApi,
        retrainingKind
      );
      if (sent.count < 1) {
        toast.error("Nazoratchi topilmadi — xabar inboxga tushmadi.");
      } else {
        toast.success("Xabar nazoratchiga yuborildi.");
        setMessage("");
        setTitle("Murojaat");
        setContactOpen(false);
      }
    } catch (error) {
      toast.error(notificationErrorMessage(error, "Xabar yuborilmadi"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Bildirishnomalar"
        description="Kurs, test va tizim xabarlari."
        action={
          unreadAvailable && unreadCount != null && unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="btn-outline-sm w-full sm:w-auto"
            >
              Hammasini o&apos;qilgan deb belgilash
            </button>
          ) : null
        }
      />
      <div className="card card-padding mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-blue text-sm font-bold text-primary">
            {personInitials(staffName)}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-primary-dark">{staffName}</p>
            <p className="text-sm text-muted">{studentStaffRoleLabel()}</p>
          </div>
        </div>
      </div>
      <DashboardTabs
        tabs={tabs}
        active={active}
        onChange={setActive}
        className="mb-6"
        action={
          allowContactAdmin ? (
            <button type="button" onClick={() => setContactOpen(true)} className="btn-primary-sm">
              <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
              Xabar yozish
            </button>
          ) : undefined
        }
      />
      {loading ? (
        <LoadingState />
      ) : listError ? (
        <ErrorState message={listError} onRetry={() => void reload()} />
      ) : (
        <>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={emptyTitle}
                description={
                  emptyDescription ??
                  (active === "unread" ? "O'qilmagan xabar yo'q." : "Hozircha bildirishnomalar mavjud emas.")
                }
              />
            ) : (
              filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={markRead}
                  onDelete={remove}
                  replyTo="admin"
                  allowReply={allowContactAdmin}
                  onReplied={() => void reload()}
                />
              ))
            )}
          </div>
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <DashboardModal
        open={allowContactAdmin && contactOpen}
        onClose={closeContact}
        title="Nazoratchiga xabar"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={sending}
              onClick={closeContact}
              className="btn-outline-sm disabled:opacity-60"
            >
              Bekor
            </button>
            <button
              type="submit"
              form="contact-admin-form"
              disabled={sending}
              className="btn-primary-sm disabled:opacity-60"
            >
              {sending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </>
        }
      >
        <form id="contact-admin-form" onSubmit={(event) => void onContact(event)} className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-blue text-xs font-bold text-primary">
              {personInitials(staffName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-dark">{staffName}</p>
              <p className="text-xs text-muted">{studentStaffRoleLabel()}</p>
            </div>
          </div>
          <p className="rounded-2xl bg-surface px-3 py-2 text-sm text-muted">
            Yuboruvchi: <span className="font-medium text-primary-dark">{senderLabel()}</span>
          </p>
          <label className="label-field text-primary-dark">
            Sarlavha
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              className="input-field mt-1.5 font-normal"
            />
          </label>
          <label className="label-field text-primary-dark">
            Xabar
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={5}
              placeholder="Nazoratchiga yozma xabar"
              className="input-field mt-1.5 min-h-[8rem] resize-y font-normal"
            />
          </label>
        </form>
      </DashboardModal>
    </div>
  );
}
