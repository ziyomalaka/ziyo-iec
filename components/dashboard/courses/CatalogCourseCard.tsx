"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { LayoutGrid, Languages } from "lucide-react";
import { cn } from "@/lib/cn";
import { educationLevelLabels } from "@/lib/dashboard/education-level";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import {
  applicationDecisionLabel,
  applicationDecisionNote,
  applyToCourse,
  canReapplyApplication,
  isMandatoryBlockCourse,
  MANDATORY_BLOCK_LEARNING_HREF,
} from "@/lib/dashboard/course-application";
import { ApiError } from "@/lib/api/errors";

const badgeTones = {
  purple: "bg-[#7C5CFC]",
  green: "bg-[#22A06B]",
  blue: "bg-[#0756F5]",
};

type CatalogCourseCardProps = {
  course: CourseCatalogItem;
  application?: ClientApplicationResponse | null;
  onApplied?: (courseId: string, application: ClientApplicationResponse) => void;
};

function statusButtonClass(status?: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700";
  if (status === "rejected") return "bg-red-50 text-red-700";
  if (status === "processing") return "bg-[#EEF4FF] text-[#2563EB]";
  return "bg-[#E8EDF5] text-[#64748B]";
}

export default function CatalogCourseCard({ course, application, onApplied }: CatalogCourseCardProps) {
  const [saving, setSaving] = useState(false);
  const [localApp, setLocalApp] = useState<ClientApplicationResponse | null>(null);
  const isMandatoryBlock = isMandatoryBlockCourse(course);
  const current = application ?? localApp;
  const canApply = !isMandatoryBlock && canReapplyApplication(current);
  const label = current ? applicationDecisionLabel(current) : "";
  const note = applicationDecisionNote(current);

  const handleApply = async () => {
    if (!canApply || saving) return;
    setSaving(true);
    try {
      const created = await applyToCourse(course);
      setLocalApp(created);
      onApplied?.(course.id, created);
      toast.success("Ariza nazoratchiga yuborildi.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ariza yuborilmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#e1e7f0] bg-white shadow-[0_2px_5px_rgba(15,35,70,0.05)] transition-shadow hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(15,35,70,0.09)]">
      <div className={cn("relative h-[178px] overflow-hidden bg-gradient-to-br", course.imageGradient)}>
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {course.institution ? (
          <span className="absolute top-3 left-3 rounded bg-black/35 px-2 py-0.5 text-[11px] font-semibold text-white">
            {educationLevelLabels[course.institution]}
          </span>
        ) : null}
        <span
          className={cn(
            "absolute bottom-0 left-3 flex h-[25px] items-center rounded-t px-2.5 text-[12px] font-semibold text-white",
            badgeTones[course.badgeTone]
          )}
        >
          {course.hours} soat
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-3 min-h-[70px] text-[18px] leading-[1.3] font-bold text-[#101a37]">
          {course.title}
        </h3>
        <div className="mt-3 flex items-center gap-2.5 text-[13px] text-[#445574]">
          <span className="inline-flex items-center gap-1">
            <LayoutGrid className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {course.modulesCount} modul
          </span>
          <span className="text-[#c5cedb]">|</span>
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {course.language}
          </span>
        </div>
        <div className="mt-auto pt-4">
          {note ? (
            <p className="mb-2 line-clamp-2 text-[11px] leading-snug text-[#64748B]" title={note}>
              Nazoratchi: {note}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            {isMandatoryBlock ? (
              <Link
                href={MANDATORY_BLOCK_LEARNING_HREF}
                className="flex h-[38px] items-center justify-center rounded-[7px] bg-[#0756F5] px-3 text-[12px] font-semibold text-white"
              >
                Ochish
              </Link>
            ) : canApply ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleApply()}
                className="flex h-[38px] items-center justify-center rounded-[7px] bg-[#0756F5] px-3 text-[12px] font-semibold text-white disabled:opacity-60"
              >
                {saving ? "..." : current ? "Qayta ariza" : "Ariza"}
              </button>
            ) : (
              <span
                title={note || label}
                className={cn(
                  "flex h-[38px] max-w-[140px] items-center justify-center rounded-[7px] px-2.5 text-center text-[11px] leading-tight font-semibold",
                  statusButtonClass(current?.status)
                )}
              >
                {label}
              </span>
            )}
            <Link
              href={`/dashboard/courses/${course.id}`}
              className="flex h-[38px] w-[76px] shrink-0 items-center justify-center rounded-[7px] border border-[#d9e3f0] bg-white text-[12px] font-semibold text-[#0057ff]"
            >
              Batafsil
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
