"use client";

import { Check, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { lessonKindLabel, type SidebarLessonKind } from "@/lib/learning/lesson-kind";
import type { LessonProgressStatus } from "@/lib/learning/lesson-progress";

export default function LessonNavCard({
  kind,
  code,
  title,
  progressStatus,
  selected,
  disabled,
  hasTests,
  onClick,
}: {
  kind: SidebarLessonKind;
  code: string;
  title: string;
  progressStatus: LessonProgressStatus;
  selected?: boolean;
  disabled?: boolean;
  hasTests?: boolean;
  onClick: () => void;
}) {
  const locked = progressStatus === "locked";
  const current = progressStatus === "current";
  const completed = progressStatus === "completed";
  const inProgress = progressStatus === "in_progress";

  return (
    <button
      type="button"
      disabled={disabled || locked}
      onClick={onClick}
      className={cn(
        "flex w-full min-h-11 items-start gap-2 rounded-2xl px-3 py-3 text-left shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition-shadow sm:items-center sm:gap-3",
        locked ? "cursor-not-allowed bg-[#F8FAFC] opacity-70" : "bg-white",
        (selected || current) && !locked && "ring-2 ring-[#2563EB]",
        completed && !selected && "ring-1 ring-[#E2E8F0]"
      )}
    >
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-1.5 text-xs font-bold text-white sm:px-3 sm:py-2 sm:text-sm",
          locked && "bg-[#93C5FD]",
          !locked && kind === "PRACTICAL" && "bg-[#F59E0B]",
          !locked && kind === "THEORY" && "bg-[#2563EB]",
          !locked && kind === "TEST" && "bg-slate-500"
        )}
      >
        {lessonKindLabel(kind)}
      </span>
      <span className="min-w-0 flex-1">
        {code ? (
          <span className={cn("block text-sm font-medium", locked ? "text-[#94A3B8]" : "text-[#2563EB]")}>
            {code}
          </span>
        ) : null}
        <span
          className={cn(
            "mt-0.5 block text-sm font-bold leading-snug tracking-wide break-words",
            locked ? "text-[#94A3B8]" : "text-[#334155]"
          )}
        >
          {title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2">
          {current ? <span className="text-[11px] font-semibold text-[#2563EB]">Hozirgi dars</span> : null}
          {inProgress && !current ? (
            <span className="text-[11px] font-semibold text-[#F59E0B]">Jarayonda</span>
          ) : null}
          {completed ? <span className="text-[11px] font-semibold text-[#0AA64F]">Tugatildi</span> : null}
          {hasTests ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              Test
            </span>
          ) : null}
        </span>
      </span>
      {locked ? (
        <Lock className="mt-1 h-4 w-4 shrink-0 text-[#94A3B8] sm:mt-0" />
      ) : completed ? (
        <Check className="mt-1 h-5 w-5 shrink-0 text-[#0AA64F] sm:mt-0" strokeWidth={2.5} />
      ) : (
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-[#2563EB] sm:mt-0" />
      )}
    </button>
  );
}
