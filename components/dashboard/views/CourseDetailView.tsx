"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown, Clock, Star, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { getMyApplications } from "@/lib/api/applications";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import {
  applicationDecisionNote,
  applyToCourse,
  canReapplyApplication,
  courseOpenHref,
  findCourseApplication,
  isMandatoryBlockCourse,
  MANDATORY_BLOCK_LEARNING_HREF,
} from "@/lib/dashboard/course-application";
import { getLearningCourse } from "@/lib/api/learning";
import { parsePositiveInt } from "@/lib/api/unwrap";
import { ApiError } from "@/lib/api/errors";
import { applicationBadge, applicationStatusLabel, uiLabel } from "@/lib/admin/labels";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

type CourseDetailViewProps = {
  course: CourseCatalogItem;
};

export default function CourseDetailView({ course }: CourseDetailViewProps) {
  const router = useRouter();
  const courseId = parsePositiveInt(course.id);
  const isMandatoryBlock = isMandatoryBlockCourse(course);
  const [application, setApplication] = useState<ClientApplicationResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  const refreshStatus = useCallback(async () => {
    if (isMandatoryBlock) {
      setApplication(null);
      setEnrolled(true);
      return;
    }
    try {
      const items = await getMyApplications();
      setApplication(findCourseApplication(items, course) ?? null);
    } catch {
      /* fon */
    }
    if (!courseId) return;
    try {
      const data = await getLearningCourse(courseId);
      setEnrolled(data.can_learn === true);
    } catch {
      /* fon */
    }
  }, [course, courseId, isMandatoryBlock]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useLiveRefresh(() => void refreshStatus());

  const status = application?.status ?? "";
  const statusLabel = application
    ? application.status_label || uiLabel(status, applicationStatusLabel)
    : "";
  const supervisorNote = applicationDecisionNote(application);
  const canReapply = canReapplyApplication(application);
  const canOpen = isMandatoryBlock || enrolled || status === "approved";

  const handleApply = async () => {
    if (isMandatoryBlock) return;
    if (saving) return;
    if (!canReapply) return;
    setSaving(true);
    try {
      const created = await applyToCourse(course);
      setApplication(created);
      toast.success("Ariza nazoratchiga yuborildi.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ariza yuborilmadi");
    } finally {
      setSaving(false);
    }
  };

  const handleEnroll = () => {
    if (isMandatoryBlock) {
      router.push(MANDATORY_BLOCK_LEARNING_HREF);
      return;
    }
    if (!canOpen) return;
    router.push(courseOpenHref(course, application));
  };

  return (
    <div className="space-y-6">
      <div className={cn("relative h-48 overflow-hidden rounded-2xl bg-gradient-to-br sm:h-64", course.imageGradient)}>
        {course.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnailUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div>
            <DashboardBadge>{course.direction}</DashboardBadge>
            <h1 className="mt-2 text-2xl font-bold text-[#0C2340]">{course.title}</h1>
            {course.description ? <p className="mt-3 text-[#64748B]">{course.description}</p> : null}
          </div>

          <section className="rounded-xl border border-[#E8EDF5] bg-white p-6">
            <h2 className="font-bold text-[#0C2340]">Kurs haqida</h2>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              {course.goal ? (
                <div>
                  <span className="text-[#64748B]">Maqsadi:</span>
                  <p className="mt-1">{course.goal}</p>
                </div>
              ) : null}
              {course.audience ? (
                <div>
                  <span className="text-[#64748B]">Kimlar uchun:</span>
                  <p className="mt-1">{course.audience}</p>
                </div>
              ) : null}
              {course.duration ? (
                <div>
                  <span className="text-[#64748B]">Davomiyligi:</span>
                  <p className="mt-1">{course.duration}</p>
                </div>
              ) : null}
              <div>
                <span className="text-[#64748B]">Umumiy soat:</span>
                <p className="mt-1">{course.hours} soat</p>
              </div>
              <div>
                <span className="text-[#64748B]">Modullar:</span>
                <p className="mt-1">{course.modulesCount}</p>
              </div>
              {course.lessonsCount ? (
                <div>
                  <span className="text-[#64748B]">Darslar:</span>
                  <p className="mt-1">{course.lessonsCount}</p>
                </div>
              ) : null}
              {course.format ? (
                <div>
                  <span className="text-[#64748B]">Ta'lim shakli:</span>
                  <p className="mt-1">{course.format}</p>
                </div>
              ) : null}
              {course.instructor ? (
                <div>
                  <span className="text-[#64748B]">O'qituvchi:</span>
                  <p className="mt-1">{course.instructor}</p>
                </div>
              ) : null}
              {course.subject ? (
                <div>
                  <span className="text-[#64748B]">Fan:</span>
                  <p className="mt-1">{course.subject}</p>
                </div>
              ) : null}
              {course.courseType ? (
                <div>
                  <span className="text-[#64748B]">Kurs turi:</span>
                  <p className="mt-1">{course.courseType}</p>
                </div>
              ) : null}
            </div>
          </section>

          {course.syllabus.length > 0 && (
            <section className="rounded-xl border border-[#E8EDF5] bg-white p-6">
              <h2 className="font-bold text-[#0C2340]">O'quv dasturi</h2>
              <Accordion.Root type="multiple" className="mt-4 space-y-2">
                {course.syllabus.map((module) => (
                  <Accordion.Item key={module.id} value={module.id} className="overflow-hidden rounded-lg border border-[#E8EDF5]">
                    <Accordion.Header>
                      <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-[#0C2340] hover:bg-[#F7F9FC] [&[data-state=open]>svg]:rotate-180">
                        {module.title}
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="border-t border-[#E8EDF5] px-4 py-3 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      {module.lessons.length > 0 ? (
                        <ul className="space-y-2 text-sm text-[#64748B]">
                          {module.lessons.map((lesson) => (
                            <li key={lesson.id}>
                              <div className="flex justify-between gap-3">
                                <span>{lesson.title}</span>
                                <span>{lesson.duration}</span>
                              </div>
                              {lesson.materialsCount || lesson.assignmentsCount ? (
                                <p className="mt-1 text-xs text-[#94A3B8]">
                                  {lesson.materialsCount ? `${lesson.materialsCount} material` : null}
                                  {lesson.materialsCount && lesson.assignmentsCount ? " · " : null}
                                  {lesson.assignmentsCount ? `${lesson.assignmentsCount} topshiriq` : null}
                                </p>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </Accordion.Root>
            </section>
          )}

          <section className="rounded-xl border border-[#E8EDF5] bg-white p-6">
            <h2 className="font-bold text-[#0C2340]">Sertifikat haqida</h2>
            <p className="mt-2 text-sm text-[#64748B]">
              Kurs muvaffaqiyatli yakunlangandan va yakuniy testdan o'tgandan so'ng rasmiy malaka oshirish sertifikati beriladi.
            </p>
          </section>
        </div>

        <div className="h-fit rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <div className="space-y-2 text-sm text-[#64748B]">
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {course.hours} soat
            </p>
            {course.studentsCount ? (
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {course.studentsCount} tinglovchi
              </p>
            ) : null}
            {course.rating ? (
              <p className="flex items-center gap-2">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {course.rating} reyting
              </p>
            ) : null}
          </div>
          <div className="mt-6 space-y-3">
            {canOpen ? (
              <button
                type="button"
                onClick={handleEnroll}
                className="w-full rounded-xl bg-[#2563EB] py-3 text-sm font-semibold text-white hover:bg-[#3B82F6]"
              >
                {isMandatoryBlock ? "Ochish" : "O'qishni davom ettirish"}
              </button>
            ) : null}

            {!isMandatoryBlock && application ? (
              <div className="space-y-2">
                <div
                  className={cn(
                    "flex w-full items-center justify-center rounded-xl py-3",
                    status === "approved" && "bg-emerald-50",
                    status === "rejected" && "bg-red-50",
                    status === "processing" && "bg-[#EEF4FF]",
                    (status === "pending" || !status) && "bg-[#E8EDF5]",
                    status === "archived" && "bg-[#F7F9FC]"
                  )}
                >
                  <DashboardBadge variant={applicationBadge(status)}>{statusLabel}</DashboardBadge>
                </div>
                {supervisorNote ? (
                  <p className="rounded-lg bg-[#F7F9FC] px-3 py-2 text-xs text-[#64748B]">
                    Nazoratchi: {supervisorNote}
                  </p>
                ) : status === "pending" || status === "processing" ? (
                  <p className="text-center text-xs text-[#94A3B8]">Nazoratchi javobi kutilmoqda.</p>
                ) : null}
                <Link href="/dashboard/applications" className="block text-center text-xs font-semibold text-[#2563EB]">
                  Arizalarim
                </Link>
              </div>
            ) : null}

            {!isMandatoryBlock && canReapply ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleApply()}
                className="w-full rounded-xl border border-[#E8EDF5] py-3 text-sm font-semibold text-[#0C2340] hover:bg-[#F7F9FC] disabled:opacity-60"
              >
                {saving ? "Yuborilmoqda..." : application ? "Qayta ariza topshirish" : "Kursga ariza topshirish"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
