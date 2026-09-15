"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, PlayCircle } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { mapAuthUserToDashboard, formatDate } from "@/lib/dashboard/utils";
import type { StoredTestResultRow } from "@/lib/api/learning-progress";
import { overviewContinueState } from "@/lib/api/retraining";
import type { StudentContinueState } from "@/lib/dashboard/continue-learning";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import NotificationItem from "@/components/dashboard/ui/NotificationItem";
import SupervisorContactCard from "@/components/dashboard/SupervisorContactCard";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import { retrainingGetOverview, retrainingListResults } from "@/lib/retraining/service";
import {
  isRetrainingTypeMissingError,
  useRequireRetrainingType,
} from "@/lib/retraining/use-require-type";
import { RETRAINING_SELECT_PATH } from "@/lib/auth/program";

export default function RetrainingHomeView() {
  const paths = useStudentProgramPaths();
  const router = useRouter();
  const requireType = useRequireRetrainingType();
  const sessionUser = mapAuthUserToDashboard(getAuthUser());
  const { items: notifications, unreadCount, listError, loading: notificationsLoading, markRead, reload } =
    useNotifications();
  const [firstName] = useState(sessionUser.firstName || "");
  const [continueState, setContinueState] = useState<StudentContinueState | null>(null);
  const [lastResult, setLastResult] = useState<StoredTestResultRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadGen = useRef(0);
  const load = useCallback(async (silent = false) => {
    const gen = silent ? loadGen.current : ++loadGen.current;
    if (!silent) setLoading(true);
    try {
      const type = await requireType();
      if (gen !== loadGen.current) return;
      if (!type) return;
      const [overview, results] = await Promise.all([
        retrainingGetOverview(type),
        retrainingListResults(type),
      ]);
      if (gen !== loadGen.current) return;
      setContinueState(overviewContinueState(overview, paths.learning));
      setLastResult(results[0] ?? null);
    } catch (caught) {
      if (gen !== loadGen.current) return;
      if (isRetrainingTypeMissingError(caught)) {
        router.replace(RETRAINING_SELECT_PATH);
      }
    } finally {
      if (gen === loadGen.current && !silent) setLoading(false);
    }
  }, [paths.learning, requireType, router]);

  useEffect(() => {
    void load(false);
    return () => {
      loadGen.current += 1;
    };
  }, [load]);

  const unread = notifications.filter((item) => !item.read).slice(0, 4);

  if (loading) return <LoadingState />;

  return (
    <div className="min-w-0 space-y-5">
      <section className="card card-padding">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{paths.badge}</p>
        <h2 className="mt-1 break-words text-xl font-bold text-primary-dark sm:text-2xl">
          {`Xush kelibsiz${firstName ? `, ${firstName}` : ""}`}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {paths.badge} jarayoningizni shu yerdan davom ettirasiz.
        </p>
      </section>

      <SupervisorContactCard />

      {continueState ? (
        <section className="card card-padding">
          <p className="text-xs font-semibold tracking-wide text-muted uppercase">Faol kurs</p>
          <h3 className="mt-1 break-words text-lg font-bold text-primary-dark">{continueState.courseTitle}</h3>
          <p className="mt-3 text-xs font-medium text-muted">Progress</p>
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
            O&apos;qishni davom ettirish
          </Link>
        </section>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="Kursni tanlang."
          description="Kursga ariza yuboring. Tasdiqlangach o'quv jarayoni shu yerdan ochiladi."
          action={
            <Link href={paths.courses} className="btn-primary-sm">
              Kurslarni ko&apos;rish
            </Link>
          }
        />
      )}

      <section className="card card-padding">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-primary-dark">So&apos;nggi natija</h3>
          <Link href={paths.results} className="text-sm font-semibold text-primary">
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
          <p className="mt-3 text-sm text-muted">Hozircha natija yo&apos;q.</p>
        )}
      </section>

      <section className="card card-padding">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-primary-dark">O&apos;qilmagan bildirishnomalar</h3>
          <Link href={paths.notifications} className="text-sm font-semibold text-primary">
            Barchasi
          </Link>
        </div>
        {notificationsLoading ? (
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-border" />
        ) : listError ? (
          <p className="mt-3 text-sm text-muted">{listError}</p>
        ) : unread.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {(unreadCount ?? 0) > 0 ? "O'qilmagan xabarlar boshqa sahifada." : "Yangi bildirishnomalar mavjud emas."}
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
