"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import type { Notification } from "@/lib/dashboard/types";
import { formatUzDateTime } from "@/lib/dashboard/utils";
import {
  createNotification,
  notificationErrorMessage,
  sendNotificationToAdmin,
} from "@/lib/api/notifications";
import {
  personInitials,
  studentStaffDisplayName,
  studentStaffRoleLabel,
} from "@/lib/dashboard/staff-public-label";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

type NotificationItemProps = {
  notification: Notification;
  onMarkRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  replyTo?: "admin" | "sender";
  allowReply?: boolean;
  replyUserId?: number;
  onReplied?: () => void;
  variant?: "card" | "thread";
  outgoing?: boolean;
  className?: string;
};

export default function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
  replyTo = "admin",
  allowReply = true,
  replyUserId,
  onReplied,
  variant = "card",
  outgoing = false,
  className,
}: NotificationItemProps) {
  const { notificationsApi, retrainingKind } = useStudentProgramPaths();
  const unread = !notification.read;
  const senderUserId = replyUserId ?? notification.senderId;
  const canReply = allowReply && (replyTo !== "sender" || Boolean(senderUserId));
  const showStaff =
    replyTo === "admin" &&
    (notification.fromAdmin || Boolean(notification.senderName) || notification.category === "system");
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyTitle, setReplyTitle] = useState(`Re: ${notification.title}`);
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);

  const senderLabel = showStaff
    ? studentStaffDisplayName(notification.senderName)
    : notification.senderName || (notification.senderId ? `Mijoz #${notification.senderId}` : "Mijoz");

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
    if (replyTo === "sender" && !senderUserId) {
      toast.error("Mijoz ID topilmadi");
      return;
    }
    setSending(true);
    try {
      if (replyTo === "sender" && senderUserId) {
        await createNotification({
          user_id: senderUserId,
          title,
          message,
        });
        toast.success("Javob mijozga yuborildi.");
      } else {
        const sent = await sendNotificationToAdmin(
          {
            title,
            message,
          },
          notificationsApi,
          retrainingKind
        );
        if (sent.count < 1) {
          toast.error("Nazoratchi topilmadi — xabar inboxga tushmadi.");
          return;
        }
        toast.success("Javob nazoratchiga yuborildi.");
      }
      setReplyMessage("");
      setReplyOpen(false);
      onReplied?.();
    } catch (error) {
      toast.error(notificationErrorMessage(error, "Javob yuborilmadi"));
    } finally {
      setSending(false);
    }
  };

  if (variant === "thread") {
    return (
      <div
        className={cn("flex gap-2.5", outgoing ? "flex-row-reverse" : "flex-row", className)}
        onClick={() => {
          if (unread) onMarkRead?.(notification.id);
        }}
      >
        <div
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
            outgoing ? "bg-primary text-white" : "bg-surface-blue text-primary"
          )}
        >
          {personInitials(outgoing ? "Nazoratchi" : senderLabel)}
        </div>
        <div
          className={cn(
            "max-w-[min(100%,28rem)] rounded-2xl px-4 py-3 shadow-[0_4px_16px_-6px_rgba(15,35,64,0.12)]",
            outgoing
              ? "rounded-tr-md bg-primary text-white"
              : "rounded-tl-md border border-border/70 bg-white text-primary-dark"
          )}
        >
          {notification.title ? (
            <p className={cn("text-sm font-semibold", outgoing ? "text-white" : "text-primary-dark")}>
              {notification.title}
            </p>
          ) : null}
          {notification.text ? (
            <p className={cn("mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed", outgoing ? "text-white/95" : "text-muted")}>
              {notification.text}
            </p>
          ) : null}
          <p className={cn("mt-2 text-[11px]", outgoing ? "text-white/70" : "text-slate-400")}>
            {formatUzDateTime(notification.date)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => {
        if (unread && !replyOpen) onMarkRead?.(notification.id);
      }}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border bg-white p-4 text-left shadow-[0_4px_24px_-4px_rgba(15,35,64,0.06)] transition-colors sm:flex-row sm:gap-4",
        unread ? "border-primary/20 bg-[#F8FAFF]" : "border-border/70",
        unread && onMarkRead && !replyOpen ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          unread ? "bg-primary text-white" : "bg-surface-blue text-primary"
        )}
      >
        {personInitials(senderLabel)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn("min-w-0 break-words font-semibold text-primary-dark", unread && "text-[#0A3D91]")}>
            {notification.title}
          </h4>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{notification.text}</p>
        {showStaff ? (
          <div className="mt-2">
            <p className="text-sm font-semibold text-primary-dark">{studentStaffDisplayName(notification.senderName)}</p>
            <p className="text-xs text-muted">{studentStaffRoleLabel()}</p>
          </div>
        ) : replyTo === "sender" || notification.senderName ? (
          <p className={cn("mt-1", replyTo === "sender" ? "text-sm font-medium text-primary-dark" : "text-xs text-slate-400")}>
            Kimdan: {senderLabel}
          </p>
        ) : null}
        <span className="mt-2 inline-block text-xs text-slate-400">{formatUzDateTime(notification.date)}</span>
        {replyOpen ? (
          <form
            onSubmit={(event) => void onReply(event)}
            onClick={(event) => event.stopPropagation()}
            className="mt-3 space-y-2 rounded-2xl border border-border/70 bg-surface p-3"
          >
            <input
              value={replyTitle}
              onChange={(e) => setReplyTitle(e.target.value)}
              disabled={sending}
              placeholder="Sarlavha"
              className="input-field"
            />
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              disabled={sending}
              rows={3}
              placeholder="Yozma javob"
              className="input-field min-h-[5.5rem] resize-y"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={sending} className="btn-primary-sm disabled:opacity-60">
                {sending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
              <button
                type="button"
                disabled={sending}
                onClick={() => setReplyOpen(false)}
                className="btn-outline-sm"
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
            className="btn-outline-sm px-3 text-xs"
          >
            Javob berish
          </button>
        </div>
      ) : null}
      <div className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-2 sm:flex-col sm:items-end">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
            unread ? "bg-primary/10 text-primary" : "bg-slate-100 text-muted"
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
            className="text-xs font-medium text-primary hover:underline"
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
