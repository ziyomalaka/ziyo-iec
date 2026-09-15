"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import {
  applicationDecisionNote,
  canReapplyApplication,
  isApprovedApplicationStatus,
} from "@/lib/dashboard/course-application";
import { findRetrainingApplication } from "@/lib/retraining/applications";
import { retrainingListApplications } from "@/lib/retraining/service";
import { retrainingStatusCard } from "@/lib/retraining/status";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === "") return null;
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-[#64748B]">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-[#0C2340]">{value}</p>
    </div>
  );
}

export default function RetrainingCourseDetailView({ course }: { course: CourseCatalogItem }) {
  const paths = useStudentProgramPaths();
  const [application, setApplication] = useState<ClientApplicationResponse | null>(null);

  const refresh = useCallback(async () => {
    try {
      const items = await retrainingListApplications(paths.retrainingKind);
      setApplication(findRetrainingApplication(items, course) ?? null);
    } catch {
      /* fon */
    }
  }, [course, paths.retrainingKind]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useLiveRefresh(() => void refresh());

  const approved = isApprovedApplicationStatus(application?.status);
  const canApply = canReapplyApplication(application);
  const note = applicationDecisionNote(application);
  const status = application ? retrainingStatusCard(application.status) : null;
  const format = course.format || course.language || "Onlayn";
  const extra = course;

  return (
    <div className="min-w-0 space-y-6">
      <Link href={paths.courses} className="inline-flex min-h-11 items-center text-sm font-medium text-[#0756F5]">
        ← Kurslar
      </Link>

      <div className={cn("relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br sm:h-64", course.imageGradient)}>
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>

      <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
        {course.direction ? <DashboardBadge>{course.direction}</DashboardBadge> : null}
        <h1 className="mt-2 break-words text-2xl font-bold text-[#0C2340]">{course.title}</h1>
        {status ? (
          <p className={cn("mt-3 inline-flex rounded-xl border px-3 py-1.5 text-sm font-semibold", status.className)}>
            {status.emoji} {status.label}
          </p>
        ) : null}
        {course.description ? <p className="mt-3 break-words text-sm leading-relaxed text-[#64748B]">{course.description}</p> : null}
      </section>

      <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
        <h2 className="font-bold text-[#0C2340]">Kurs haqida</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Tavsifi" value={course.description} />
          <Field label="Maqsadi" value={course.goal} />
          <Field label="Davomiyligi" value={course.duration} />
          <Field label="Soat hajmi" value={course.hours ? `${course.hours} soat` : null} />
          <Field label="O'qish shakli" value={format} />
          <Field label="Modullar soni" value={course.modulesCount} />
          <Field label="Talablar" value={extra.requirements || course.audience} />
          <Field label="Qabul shartlari" value={extra.admission} />
        </div>
      </section>

      {course.syllabus.length ? (
        <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
          <h2 className="font-bold text-[#0C2340]">Modullar</h2>
          <ol className="mt-3 space-y-2">
            {course.syllabus.map((module, index) => (
              <li key={module.id} className="rounded-xl bg-[#F7F9FC] px-3 py-2 text-sm text-[#0C2340]">
                {index + 1}-modul · {module.title}
                {module.lessons.length ? (
                  <span className="ml-2 text-xs text-[#64748B]">{module.lessons.length} dars</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {note && status?.kind === "rejected" ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Rad sababi: {note}</p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!application || canApply ? (
          <Link
            href={`${paths.applications}?course=${encodeURIComponent(course.id)}`}
            className="flex min-h-11 items-center justify-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
          >
            {application && status?.kind === "rejected" ? "Qayta ariza berish" : "Ariza berish"}
          </Link>
        ) : approved ? (
          <Link
            href={paths.myCourses}
            className="flex min-h-11 items-center justify-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
          >
            Mening kurslarim
          </Link>
        ) : (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Arizangiz ko&apos;rib chiqilmoqda.
          </p>
        )}
      </div>
    </div>
  );
}
