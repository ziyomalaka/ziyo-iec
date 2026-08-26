"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/cn";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[#0C2340]/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Yopish"
      />
      <div
        className={cn(
          "relative w-full rounded-2xl border border-[#E8EDF5] bg-white shadow-2xl",
          sizes[size]
        )}
      >
        <div className="flex items-center justify-between border-b border-[#E8EDF5] px-6 py-4">
          <h2 className="text-lg font-semibold text-[#0C2340]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F7F9FC] hover:text-[#0C2340]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex justify-end gap-3 border-t border-[#E8EDF5] px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
