"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/dashboard/types";
import { formatUzDateTime } from "@/lib/dashboard/utils";
import {
  createNotification,
  formatToAdminMessage,
  notificationErrorMessage,
  sendNotificationToAdmin,
} from "@/lib/api/notifications";
import { getAuthUser } from "@/lib/auth/session";

type NotificationItemProps = {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  replyTo?: "admin" | "sender";
  className?: string;
};

export default function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  replyTo = "admin",
  className,
}: NotificationItemProps) {
  const unread = !notification.read;
  const canReply =
    replyTo === "admin"
      ? notification.fromAdmin
      : Boolean(notification.senderId);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTitle, setReplyTitle] = useState(`Re: ${notification.title}`);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  const onReply = async (event: FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (sending) return;
    const title = replyTitle.trim();
    const message = replyMessage.trim();
    if (!title || !message) {
      toast.error("Sarlavha va javob matni to'ldirilishi shart");
      return;
    }
    if (replyTo === "sender" && !notification.senderId) {
      toast.error("Mijoz ID topilmadi");
      return;
    }
    setSending(true);
    try {
      if (replyTo === "sender" && notification.senderId) {
        await createNotification({
          user_id: notification.senderId,
          title,
          message,
        });
        toast.success("Javob mijozga yuborildi.");
      } else {
        const sent = await sendNotificationToAdmin({
          title,
          message: formatToAdminMessage(message, getAuthUser()),
        });
        if (sent.count < 1) {
          toast.error("Nazoratchi topilmadi — xabar inboxga tushmadi.");
        } else {
          toast.success("Javob nazoratchiga yuborildi.");
        }
      }
      setReplyMessage("");
      setReplyOpen(false);
    } catch (error) {
      toast.error(notificationErrorMessage(error, "Javob yuborilmadi"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={() => {
        if (unread && !replyOpen) onMarkRead?.(notification.id);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-white p-4 text-left transition-colors sm:flex-row sm:gap-4",
        unread
          ? "border-[#2563EB]/25 bg-[#F8FAFF]"
          : "border-[#E8EDF5] bg-white opacity-90",
        unread && onMarkRead && !replyOpen ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      <span
        className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", unread ? "bg-[#0756F5]" : "bg-transparent")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn("min-w-0 break-words font-semibold text-[#0C2340]", unread && "text-[#0A3D91]")}>
            {notification.title}
          </h4>
        </div>
        <p className="mt-1 break-words text-sm text-[#64748B] whitespace-pre-wrap">{notification.text}</p>
        {replyTo === "sender" || notification.senderName ? (
          <p className={cn("mt-1", replyTo === "sender" ? "text-sm font-medium text-[#0C2340]" : "text-xs text-[#94A3B8]")}>
            Kimdan: {notification.senderName || (notification.senderId ? `Mijoz #${notification.senderId}` : "Mijoz")}
          </p>
        ) : null}
        <span className="mt-2 inline-block text-xs text-[#94A3B8]">
          {formatUzDateTime(notification.date)}
        </span>
        {replyOpen ? (
          <form
            onSubmit={(event) => void onReply(event)}
            onClick={(event) => event.stopPropagation()}
            className="mt-3 space-y-2 rounded-lg border border-[#E8EDF5] bg-white p-3"
          >
            <input
              value={replyTitle}
              onChange={(e) => setReplyTitle(e.target.value)}
              disabled={sending}
              placeholder="Sarlavha"
              className="w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
            />
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              disabled={sending}
              rows={3}
              placeholder="Yozma javob"
              className="w-full rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={sending}
                className="rounded-lg bg-[#0756F5] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-60"
              >
                {sending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setReplyOpen(false)}
                className="rounded-lg border border-[#E8EDF5] px-4 py-1.5 text-sm text-[#64748B]"
              >
                Bekor
              </button>
            </div>
          </form>
        ) : null}
      </div>
      {canReply && !replyOpen ? (
        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setReplyTitle(`Re: ${notification.title}`);
              setReplyOpen(true);
            }}
            className="min-h-11 rounded-lg border border-[#0756F5] px-3 py-1.5 text-xs font-medium text-[#0756F5] hover:bg-[#EEF4FF]"
          >
            Javob berish
          </button>
        </div>
      ) : null}
      <div className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            unread ? "bg-[#EEF4FF] text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"
          )}
        >
          {unread ? "O'qilmagan" : "O'qilgan"}
        </span>
        {unread && onMarkRead ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMarkRead(notification.id);
            }}
            className="text-xs font-medium text-[#2563EB] hover:underline"
          >
            O&apos;qildi deb belgilash
          </button>
        ) : null}
        {onDelete ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(notification.id);
            }}
            className="text-xs font-medium text-[#EF3340] hover:underline"
          >
            O&apos;chirish
          </button>
        ) : null}
      </div>
    </div>
  );
}
