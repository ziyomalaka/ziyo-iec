"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, PlayCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { mapAuthUserToDashboard, formatDate } from "@/lib/dashboard/utils";
import { profileService } from "@/lib/profile/service";
import { fetchMyTestResults, type StoredTestResultRow } from "@/lib/api/learning-progress";
import { getRetrainingOverview, overviewContinueState, overviewLastResult } from "@/lib/api/retraining";
import type { StudentContinueState } from "@/lib/dashboard/continue-learning";
import { loadRetrainingContinueState } from "@/lib/retraining/continue";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

export default function RetrainingHomeView() {
  const sessionUser = mapAuthUserToDashboard(getAuthUser());
  const { items: notifications, unreadCount, listError, loading: notificationsLoading, markRead, reload } =
    useNotifications();
  const [firstName, setFirstName] = useState(sessionUser.firstName || "");
  const [welcome, setWelcome] = useState("");
  const [message, setMessage] = useState("");
  const [continueState, setContinueState] = useState<StudentContinueState | null>(null);
  const [lastResult, setLastResult] = useState<StoredTestResultRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dashboard, overview, results, continueNext] = await Promise.all([
        profileService.getDashboard().catch(() => null),
        getRetrainingOverview().catch(() => null),
        fetchMyTestResults("retraining").catch(() => ({ items: [] as StoredTestResultRow[] })),
        loadRetrainingContinueState().catch(() => null),
      ]);
      if (dashboard?.profile.firstName) setFirstName(dashboard.profile.firstName);
      if (overview?.welcome) setWelcome(overview.welcome);
      if (overview?.message) setMessage(overview.message);
      setContinueState((overview && overviewContinueState(overview)) ?? continueNext);
      setLastResult((overview && overviewLastResult(overview)) ?? results.items[0] ?? null);
      setError(null);
    } catch (err) {
      if (!silent) setError(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  const unread = notifications.filter((item) => !item.read).slice(0, 4);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void load(false)} />;

  return (
    <div className="min-w-0 space-y-5">
      <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
        <p className="text-xs font-semibold tracking-wide text-[#64748B] uppercase">Qayta tayyorlash</p>
        <h2 className="mt-1 break-words text-xl font-bold text-[#0C2340] sm:text-2xl">
          {welcome || `Xush kelibsiz${firstName ? `, ${firstName}` : ""}`}
        </h2>
        <p className="mt-1 text-sm text-[#64748B]">
          {message || "Qayta tayyorlash jarayoningizni shu yerdan davom ettirasiz."}
        </p>
      </section>

      {continueState ? (
        <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
          <p className="text-xs font-semibold tracking-wide text-[#64748B] uppercase">Faol kurs</p>
          <h3 className="mt-1 break-words text-lg font-bold text-[#0C2340]">{continueState.courseTitle}</h3>
          <p className="mt-3 text-xs font-medium text-[#64748B]">Progress</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-[#E8EDF5]">
              <div
                className="h-full rounded-full bg-[#0756F5]"
                style={{ width: `${continueState.progressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-sm font-bold text-[#0C2340]">{continueState.progressPercent}%</span>
          </div>
          <p className="mt-2 text-xs text-[#64748B]">
            {continueState.completedLessons} / {continueState.totalLessons || "—"} dars yakunlangan
            {continueState.moduleCount ? ` · ${continueState.moduleCount} modul` : ""}
          </p>
          <p className="mt-4 text-xs font-semibold tracking-wide text-[#64748B] uppercase">Hozirgi dars</p>
          <p className="mt-1 break-words text-sm font-semibold text-[#0C2340]">
            {continueState.currentLessonTitle || "Darsni ochib davom eting"}
          </p>
          <Link
            href={continueState.href}
            className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0756F5] text-sm font-semibold text-white"
          >
            <PlayCircle className="h-5 w-5" strokeWidth={1.75} />
            O&apos;qishni davom ettirish
          </Link>
        </section>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Qayta tayyorlash kursini tanlang."
          description="Kursga ariza yuboring. Tasdiqlangach o'quv jarayoni shu yerdan ochiladi."
          action={
            <Link
              href="/retraining/courses"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
            >
              Kurslarni ko&apos;rish
            </Link>
          }
        />
      )}

      <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#0C2340]">So&apos;nggi natija</h3>
          <Link href="/retraining/results" className="text-sm font-medium text-[#0756F5]">
            Barchasi
          </Link>
        </div>
        {lastResult ? (
          <div className="mt-3 rounded-xl border border-[#E8EDF5] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-[#0C2340]">
                  {lastResult.lessonTitle || lastResult.testTitle || "Test"}
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {lastResult.courseTitle ? `${lastResult.courseTitle} · ` : ""}
                  {lastResult.attempt ? `${lastResult.attempt}-urinish · ` : ""}
                  {formatDate(lastResult.date)}
                </p>
              </div>
              <DashboardBadge variant={lastResult.passed ? "success" : "danger"}>
                {lastResult.passed ? "O'tdi" : "O'tmadi"}
              </DashboardBadge>
            </div>
            <p className="mt-3 text-lg font-bold text-[#0C2340]">
              {lastResult.percentage != null || lastResult.score != null
                ? `${lastResult.percentage ?? lastResult.score}%`
                : "—"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-[#64748B]">Hozircha qayta tayyorlash natijasi yo&apos;q.</p>
        )}
      </section>

      <section className="rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-[#0C2340]">O&apos;qilmagan bildirishnomalar</h3>
          <Link href="/retraining/notifications" className="text-sm font-medium text-[#0756F5]">
            Barchasi
          </Link>
        </div>
        {notificationsLoading ? (
          <div className="mt-3 h-24 animate-pulse rounded-xl bg-[#E8EDF5]" />
        ) : listError ? (
          <ErrorState message={listError} onRetry={() => void reload()} className="mt-3 py-8" />
        ) : unread.length === 0 ? (
          <p className="mt-3 text-sm text-[#64748B]">
            {unreadCount > 0 ? "O'qilmagan xabarlar boshqa sahifada." : "Yangi bildirishnomalar mavjud emas."}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {unread.map((item) => (
              <NotificationItem key={item.id} notification={item} onMarkRead={markRead} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
