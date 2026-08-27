"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Award, BookOpen, CheckCircle, TrendingUp } from "lucide-react";
import { getAuthUser } from "@/lib/auth/session";
import { mapAuthUserToDashboard, formatDateTime } from "@/lib/dashboard/utils";
import { profileService } from "@/lib/profile/service";
import type { ProfileDashboard } from "@/lib/profile/types";
import { getCatalogCourses } from "@/lib/dashboard/qualification-catalog";
import { getMyApplications } from "@/lib/api/applications";
import { mapCourseCard } from "@/lib/dashboard/mappers/courses";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import { applicationBadge, applicationStatusLabel, uiLabel } from "@/lib/admin/labels";
import { isMandatoryBlockCourse } from "@/lib/dashboard/course-application";
import StatCard from "@/components/dashboard/ui/StatCard";
import CourseCard from "@/components/dashboard/ui/CourseCard";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

export default function DashboardHomeView() {
  const sessionUser = mapAuthUserToDashboard(getAuthUser());
  const { items: notifications, listError, loading: notificationsLoading, markRead } = useNotifications();
  const [dash, setDash] = useState<ProfileDashboard | null>(null);
  const [courses, setCourses] = useState<CourseCatalogItem[]>([]);
  const [applications, setApplications] = useState<ClientApplicationResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const [dashboardRes, coursesRes, appsRes] = await Promise.allSettled([
      profileService.getDashboard(),
      getCatalogCourses({ page: 1, per_page: 6 }),
      getMyApplications(),
    ]);
    if (dashboardRes.status === "fulfilled") setDash(dashboardRes.value);
    if (coursesRes.status === "fulfilled") {
      setCourses((coursesRes.value.items ?? []).map(mapCourseCard).filter((course) => !isMandatoryBlockCourse(course)));
    }
    if (appsRes.status === "fulfilled") setApplications(appsRes.value.slice(0, 5));
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  const firstName = dash?.profile.firstName || sessionUser.firstName || "";
  const stats = dash?.stats;
  const activities = dash?.activities.slice(0, 4) ?? [];

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="break-words text-xl font-bold text-[#0C2340] sm:text-2xl">Xush kelibsiz{firstName ? `, ${firstName}` : ""}!</h2>
        <p className="mt-1 text-sm text-[#64748B]">
          Ta'lim jarayoningiz va malaka oshirish holatingizni kuzatib boring.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami kurslar" value={stats?.totalCourses ?? 0} icon={BookOpen} />
        <StatCard label="Tugallangan kurslar" value={stats?.completedCourses ?? 0} icon={CheckCircle} />
        <StatCard label="O'rtacha natija" value={stats?.averageScore ?? 0} suffix="%" icon={TrendingUp} />
        <StatCard label="Sertifikatlar" value={stats?.certificateCount ?? 0} icon={Award} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#0C2340]">So'nggi arizalar</h3>
            <Link href="/dashboard/applications" className="text-sm text-[#2563EB] hover:underline">
              Barchasi
            </Link>
          </div>
          {applications.length === 0 ? (
            <p className="mt-4 text-sm text-[#64748B]">Hali ariza yo'q.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {applications.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#E8EDF5] p-3">
                  <div>
                    <p className="text-sm font-medium text-[#0C2340]">{item.title}</p>
                    <p className="mt-1 text-xs text-[#64748B]">{item.type ?? "Kursga ariza"}</p>
                  </div>
                  <DashboardBadge variant={applicationBadge(item.status)}>
                    {item.status_label || uiLabel(item.status, applicationStatusLabel)}
                  </DashboardBadge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-[#0C2340]">Faoliyat</h3>
          {activities.length === 0 ? (
            <p className="mt-4 text-sm text-[#64748B]">Hozircha yozuv yo'q.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {activities.map((item) => (
                <li key={item.id} className="rounded-lg border border-[#E8EDF5] p-3">
                  <p className="text-sm font-medium text-[#0C2340]">{item.title}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{item.description}</p>
                  {item.createdAt ? (
                    <p className="mt-1 text-xs text-[#2563EB]">{formatDateTime(item.createdAt)}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0C2340]">So'nggi bildirishnomalar</h3>
          <Link href="/dashboard/notifications" className="text-sm text-[#2563EB] hover:underline">
            Barchasi
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {notificationsLoading ? (
            <p className="text-sm text-[#64748B]">Yuklanmoqda...</p>
          ) : listError ? (
            <p className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-4 py-6 text-center text-sm text-[#B91C1C]">
              Bildirishnomalarni yuklashda xatolik yuz berdi.
            </p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-[#64748B]">Hozircha bildirishnomalar mavjud emas.</p>
          ) : (
            notifications.slice(0, 3).map((n) => (
              <NotificationItem key={n.id} notification={n} onMarkRead={markRead} />
            ))
          )}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#0C2340]">Kurslar</h3>
          <Link href="/dashboard/courses" className="text-sm text-[#2563EB] hover:underline">
            Barchasi
          </Link>
        </div>
        {courses.length === 0 ? (
          <p className="text-sm text-[#64748B]">Kurslar hozircha yo'q.</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
