"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { useLockBodyScroll } from "@/lib/hooks/useLockBodyScroll";

type DashboardModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg" | "xl";
};

const sizes = {
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function DashboardModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
}: DashboardModalProps) {
  useLockBodyScroll(open);
  useEscapeKey(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0C2340]/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Yopish"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-modal-title"
        className={cn(
          "relative flex max-h-[min(92dvh,100%)] w-[calc(100%-1.5rem)] flex-col rounded-t-2xl border border-[#E8EDF5] bg-white shadow-2xl sm:w-full sm:rounded-2xl",
          sizes[size]
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#E8EDF5] px-4 py-3 sm:px-6 sm:py-4">
          <h2 id="dashboard-modal-title" className="min-w-0 break-words text-base font-semibold text-[#0C2340] sm:text-lg">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F7F9FC] hover:text-[#0C2340]"
            aria-label="Yopish"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-[#E8EDF5] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
