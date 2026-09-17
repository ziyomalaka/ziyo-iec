"use client";

import { Clock3, Languages, LayoutGrid } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { RetrainingCatalogCourse, RetrainingCta } from "@/lib/api/types/retraining";
import { applicationDecisionNote, isApprovedApplicationStatus } from "@/lib/dashboard/course-application";
import { studentApplicationKind } from "@/lib/dashboard/student-status";
import { retrainingStatusCard } from "@/lib/retraining/status";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

type RetrainingCourseCardProps = {
  course: RetrainingCatalogCourse;
  application?: ClientApplicationResponse | null;
};

function resolveCta(course: RetrainingCatalogCourse, application?: ClientApplicationResponse | null): RetrainingCta {
  if (course.cta) return course.cta;
  if (!application) return course.canApply === false ? "none" : "apply";
  const kind = studentApplicationKind(application.status);
  if (kind === "approved") return "my_courses";
  if (kind === "rejected") return "reapply";
  return "pending";
}

export default function RetrainingCourseCard({ course, application }: RetrainingCourseCardProps) {
  const paths = useStudentProgramPaths();
  const kind = studentApplicationKind(application?.status ?? course.applicationStatus);
  const approved = isApprovedApplicationStatus(application?.status ?? course.applicationStatus);
  const note = applicationDecisionNote(application) || course.rejectReason;
  const status =
    application || course.applicationStatus
      ? retrainingStatusCard(application?.status ?? course.applicationStatus)
      : null;
  const format = course.format || course.language || "Onlayn";
  const cta = resolveCta(course, application);

  return (
    <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
      <div className={cn("relative h-[178px] overflow-hidden bg-gradient-to-br", course.imageGradient)}>
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.thumbnailUrl}
            alt={course.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {course.hours ? (
          <span className="absolute bottom-0 left-3 flex h-[25px] items-center rounded-t bg-[#0756F5] px-2.5 text-[12px] font-semibold text-white">
            {course.hours} soat
          </span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="line-clamp-3 break-words text-[18px] leading-[1.3] font-bold text-[#101a37]">
          {course.title}
        </h3>
        {course.description ? (
          <p className="mt-2 line-clamp-3 break-words text-[13px] leading-snug text-[#64748B]">{course.description}</p>
        ) : null}

        {status && cta !== "apply" && cta !== "none" ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DashboardBadge variant={kind === "approved" ? "success" : kind === "rejected" ? "danger" : "info"}>
              {status.emoji} {status.label}
            </DashboardBadge>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2.5 text-[13px] text-[#445574]">
          <span className="inline-flex items-center gap-1">
            <LayoutGrid className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {course.modulesCount} modul
          </span>
          <span className="text-[#c5cedb]">|</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {course.duration || `${course.hours || "—"} soat`}
          </span>
          <span className="text-[#c5cedb]">|</span>
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {format}
          </span>
        </div>

        {kind === "rejected" && note ? (
          <p className="mt-3 break-words text-[12px] leading-snug text-[#B91C1C]">Rad sababi: {note}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap justify-end gap-2 pt-4">
          {cta === "my_courses" || approved ? (
            <Link
              href={paths.myCourses}
              className="flex min-h-11 items-center justify-center rounded-xl bg-[#0756F5] px-3 text-[13px] font-semibold text-white"
            >
              Mening kurslarim
            </Link>
          ) : cta === "pending" ? (
            <span className="flex min-h-11 items-center justify-center rounded-xl bg-[#EEF4FF] px-3 text-center text-[13px] font-semibold text-[#2563EB]">
              Ko&apos;rib chiqilmoqda
            </span>
          ) : cta === "none" ? null : (
            <Link
              href={`${paths.applications}?course=${encodeURIComponent(course.id)}`}
              className="flex min-h-11 items-center justify-center rounded-xl bg-[#0756F5] px-3 text-[13px] font-semibold text-white"
            >
              {cta === "reapply" || (application && kind === "rejected") ? "Qayta ariza berish" : "Ariza berish"}
            </Link>
          )}
          <Link
            href={`${paths.courses}/${course.id}`}
            className="flex min-h-11 min-w-[76px] shrink-0 items-center justify-center rounded-xl border border-[#d9e3f0] bg-white px-3 text-[13px] font-semibold text-[#0057ff]"
          >
            Batafsil
          </Link>
        </div>
      </div>
    </article>
  );
}
