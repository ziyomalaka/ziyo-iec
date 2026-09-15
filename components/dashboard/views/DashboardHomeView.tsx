"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { BookOpen, PlayCircle } from "lucide-react";
import { getAuthUser } from "@/lib/auth/session";
import { mapAuthUserToDashboard, formatDate } from "@/lib/dashboard/utils";
import { profileService } from "@/lib/profile/service";
import { loadStudentContinueState, type StudentContinueState } from "@/lib/dashboard/continue-learning";
import { fetchMyTestResults, type StoredTestResultRow } from "@/lib/api/learning-progress";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import SupervisorContactCard from "@/components/dashboard/SupervisorContactCard";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

export default function DashboardHomeView() {
  const sessionUser = mapAuthUserToDashboard(getAuthUser());
  const { items: notifications, unreadCount, listError, loading: notificationsLoading, markRead, reload } =
    useNotifications();
  const [firstName, setFirstName] = useState(sessionUser.firstName || "");
  const [continueState, setContinueState] = useState<StudentContinueState | null>(null);
  const [lastResult, setLastResult] = useState<StoredTestResultRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [dashboard, continueNext, results] = await Promise.all([
        profileService.getDashboard().catch(() => null),
        loadStudentContinueState(),
        fetchMyTestResults().catch(() => ({ items: [] as StoredTestResultRow[] })),
      ]);
      if (dashboard?.profile.firstName) setFirstName(dashboard.profile.firstName);
      setContinueState(continueNext);
      setLastResult(results.items[0] ?? null);
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
      <section className="card card-padding">
        <h2 className="break-words text-xl font-bold text-primary-dark sm:text-2xl">
          Xush kelibsiz{firstName ? `, ${firstName}` : ""}!
        </h2>
        <p className="mt-1 text-sm text-muted">Malaka oshirish jarayoningizni shu yerdan davom ettirasiz.</p>
      </section>

      <SupervisorContactCard />

      {continueState ? (
        <section className="card card-padding">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Faol yo'nalish</p>
          <h3 className="mt-1 break-words text-lg font-bold text-primary-dark">{continueState.courseTitle}</h3>
          <p className="mt-3 text-xs font-medium text-muted">Umumiy o'quv progress</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${continueState.progressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-sm font-bold text-primary-dark">{continueState.progressPercent}%</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            {continueState.completedLessons} / {continueState.totalLessons || "—"} dars yakunlangan
            {continueState.moduleCount ? ` · ${continueState.moduleCount} modul` : ""}
          </p>
          <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">Hozirgi dars</p>
          <p className="mt-1 break-words text-sm font-semibold text-primary-dark">
            {continueState.currentLessonTitle || "Darsni ochib davom eting"}
          </p>
          <Link href={continueState.href} className="btn-primary mt-5 w-full">
            <PlayCircle className="h-5 w-5" strokeWidth={1.75} />
            Darsni davom ettirish
          </Link>
        </section>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Faol yo'nalish yo'q"
          description="Malaka oshirish yo'nalishiga ariza yuboring. Tasdiqlangach dars shu yerdan ochiladi."
          action={
            <Link href="/dashboard/courses" className="btn-primary-sm">
              Yo'nalishlarni ko'rish
            </Link>
          }
        />
      )}

      <section className="card card-padding">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-primary-dark">So'nggi natija</h3>
          <Link href="/dashboard/results" className="text-sm font-semibold text-primary">
            Barchasi
          </Link>
        </div>
        {lastResult ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-primary-dark">
                  {lastResult.lessonTitle || lastResult.testTitle || "Test"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {lastResult.courseTitle ? `${lastResult.courseTitle} · ` : ""}
                  {lastResult.attempt ? `${lastResult.attempt}-urinish · ` : ""}
                  {formatDate(lastResult.date)}
                </p>
              </div>
              <DashboardBadge variant={lastResult.passed ? "success" : "danger"}>
                {lastResult.passed ? "O'tdi" : "O'tmadi"}
              </DashboardBadge>
            </div>
            <p className="mt-3 text-lg font-bold text-primary-dark">
              {lastResult.percentage != null || lastResult.score != null
                ? `${lastResult.percentage ?? lastResult.score}%`
                : "—"}
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Hozircha test natijasi yo'q.</p>
        )}
      </section>

      <section className="card card-padding">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-primary-dark">O'qilmagan bildirishnomalar</h3>
          <Link href="/dashboard/notifications" className="text-sm font-semibold text-primary">
            Barchasi
          </Link>
        </div>
        {notificationsLoading ? (
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-border" />
        ) : listError ? (
          <ErrorState message={listError} onRetry={() => void reload()} className="mt-3 py-8" />
        ) : unread.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {unreadCount != null && unreadCount > 0
              ? "O'qilmagan xabarlar boshqa sahifada."
              : "Yangi bildirishnoma yo'q."}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {unread.map((item) => (
              <NotificationItem
                key={item.id}
                notification={item}
                onMarkRead={markRead}
                onReplied={() => void reload()}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
