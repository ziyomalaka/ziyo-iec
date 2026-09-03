"use client";

import { Check, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import type { LessonProgressStatus } from "@/lib/learning/lesson-progress";
import { toLessonUiState } from "@/lib/learning/lesson-progress";

export default function LessonNavCard({
  code,
  title,
  progressStatus,
  selected,
  disabled,
  onClick,
}: {
  code: string;
  title: string;
  progressStatus: LessonProgressStatus;
  selected?: boolean;
  disabled?: boolean;
  hasTests?: boolean;
  kind?: string;
  onClick: () => void;
}) {
  const ui = toLessonUiState(progressStatus);
  const locked = ui === "locked";
  const current = ui === "current";
  const completed = ui === "completed";

  return (
    <button
      type="button"
      disabled={disabled || locked}
      onClick={onClick}
      aria-label={`${code}. ${title}${current ? ". Hozirgi dars" : ""}${locked ? ". Yopiq" : ""}`}
      className={cn(
        "flex w-full min-h-11 items-start gap-3 rounded-2xl px-3 py-3 text-left transition-shadow",
        locked && "cursor-not-allowed bg-[#F8FAFC] text-[#94A3B8]",
        !locked && "bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)]",
        current && !locked && "border-2 border-[#0756F5] bg-[#EEF4FF] ring-2 ring-[#2563EB]",
        selected && !current && !locked && "ring-1 ring-[#2563EB]/40",
        completed && !selected && !current && "ring-1 ring-[#E2E8F0]"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          completed && "bg-[#DCFCE7] text-[#15803D]",
          current && "bg-[#2563EB] text-white",
          ui === "available" && "border-2 border-[#CBD5E1] text-[#64748B]",
          locked && "border-2 border-[#E2E8F0] text-[#94A3B8]"
        )}
        aria-hidden
      >
        {completed ? (
          <Check className="h-4 w-4" strokeWidth={2.5} />
        ) : current ? (
          "●"
        ) : locked ? (
          ""
        ) : (
          "○"
        )}
      </span>
      <span className="min-w-0 flex-1">
        {code ? (
          <span className={cn("block text-sm font-semibold", locked ? "text-[#94A3B8]" : "text-[#2563EB]")}>
            {code}
          </span>
        ) : null}
        <span
          className={cn(
            "mt-0.5 block text-sm font-bold leading-snug tracking-wide break-words",
            locked ? "text-[#94A3B8]" : "text-[#0C2340]"
          )}
        >
          {title}
        </span>
        {current ? (
          <span className="mt-1 inline-flex rounded-md bg-[#2563EB] px-2 py-0.5 text-[11px] font-semibold text-white">
            Hozirgi dars
          </span>
        ) : null}
      </span>
      {locked ? (
        <Lock className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8]" aria-hidden />
      ) : (
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#2563EB]" aria-hidden />
      )}
    </button>
  );
}
