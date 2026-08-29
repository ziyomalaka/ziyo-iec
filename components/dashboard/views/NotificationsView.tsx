"use client";

import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import DashboardTabs from "@/components/dashboard/ui/DashboardTabs";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import AdminPagination from "@/components/admin/AdminPagination";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { getAuthUser } from "@/lib/auth/session";
import {
  formatToAdminMessage,
  notificationErrorMessage,
  sendNotificationToAdmin,
} from "@/lib/api/notifications";

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

export default function NotificationsView() {
  const [active, setActive] = useState("all");
  const [contactOpen, setContactOpen] = useState(false);
  const [title, setTitle] = useState("Murojaat");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const {
    items,
    unreadCount,
    loading,
    listError,
    page,
    totalPages,
    setPage,
    markRead,
    markAllRead,
    remove,
  } = useNotifications();

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
      const sent = await sendNotificationToAdmin({
        title: trimmedTitle,
        message: formatToAdminMessage(trimmedMessage, getAuthUser()),
      });
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
          unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => markAllRead()}
              className="min-h-11 w-full rounded-xl border border-[#E8EDF5] px-4 py-2 text-sm font-medium text-[#2563EB] hover:bg-[#F7F9FC] sm:w-auto"
            >
              Hammasini o&apos;qilgan deb belgilash
            </button>
          ) : null
        }
      />
      <DashboardTabs
        tabs={tabs}
        active={active}
        onChange={setActive}
        className="mb-6"
        action={
          <button
            type="button"
            onClick={() => setContactOpen(true)}
            className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white hover:bg-[#0648d1]"
          >
            Admin bilan bog&apos;lanish
          </button>
        }
      />
      {loading ? (
        <LoadingState />
      ) : listError ? (
        <p className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-8 text-center text-sm text-[#B91C1C]">
          {listError}
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="rounded-xl border border-[#E8EDF5] bg-white px-4 py-8 text-center text-sm text-[#64748B]">
                Hozircha bildirishnomalar mavjud emas.
              </p>
            ) : (
              filtered.map((n) => (
                <NotificationItem
                  key={n.id}
                  notification={n}
                  onMarkRead={markRead}
                  onDelete={remove}
                  replyTo="admin"
                />
              ))
            )}
          </div>
          <AdminPagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}

      <DashboardModal
        open={contactOpen}
        onClose={closeContact}
        title="Admin bilan bog'lanish"
        size="md"
        footer={
          <>
            <button
              type="button"
              disabled={sending}
              onClick={closeContact}
              className="rounded-lg border border-[#E8EDF5] px-4 py-2 text-sm text-[#64748B] disabled:opacity-60"
            >
              Bekor
            </button>
            <button
              type="submit"
              form="contact-admin-form"
              disabled={sending}
              className="rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {sending ? "Yuborilmoqda..." : "Yuborish"}
            </button>
          </>
        }
      >
        <form id="contact-admin-form" onSubmit={(event) => void onContact(event)} className="space-y-4">
          <p className="rounded-lg bg-[#F7F9FC] px-3 py-2 text-sm text-[#64748B]">
            Yuboruvchi: <span className="font-medium text-[#0C2340]">{senderLabel()}</span>
          </p>
          <label className="block text-sm font-medium text-[#0C2340]">
            Sarlavha
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="block text-sm font-medium text-[#0C2340]">
            Xabar
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              rows={5}
              placeholder="Nazoratchiga yozma xabar"
              className="mt-1 w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm font-normal"
            />
          </label>
        </form>
      </DashboardModal>
    </div>
  );
}
