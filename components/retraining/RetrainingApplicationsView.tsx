"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ClipboardList } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { profileService } from "@/lib/profile/service";
import { applicationDecisionNote, canReapplyApplication, isApprovedApplicationStatus } from "@/lib/dashboard/course-application";
import { applyToRetrainingCourse, findRetrainingApplication, getRetrainingApplications } from "@/lib/retraining/applications";
import { getRetrainingCourse } from "@/lib/retraining/catalog";
import { retrainingStatusCard } from "@/lib/retraining/status";
import type { ClientApplicationResponse } from "@/lib/api/types/applications";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import { ApiError } from "@/lib/api/errors";
import { studentApiErrorMessage } from "@/lib/learning/student-errors";
import { formatApplicationEvent } from "@/lib/dashboard/utils";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import EmptyState from "@/components/dashboard/ui/EmptyState";
import ErrorState from "@/components/dashboard/ui/ErrorState";
import LoadingState from "@/components/dashboard/ui/LoadingState";
import { cn } from "@/lib/cn";
import { useLiveRefresh } from "@/lib/hooks/useLiveRefresh";

type ProfileSnapshot = {
  fullName: string;
  phone: string;
  email: string;
  region: string;
  education: string;
  specialty: string;
  workplace: string;
  position: string;
};

function readOnlyField(label: string, value: string) {
  return (
    <label className="block min-w-0 text-sm font-medium text-[#0C2340]">
      {label}
      <input
        value={value || "—"}
        readOnly
        className="mt-1 min-h-11 w-full rounded-xl border border-[#E8EDF5] bg-[#F7F9FC] px-3 text-sm font-normal text-[#334155]"
      />
    </label>
  );
}

export default function RetrainingApplicationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course")?.trim() ?? "";
  const [items, setItems] = useState<ClientApplicationResponse[]>([]);
  const [course, setCourse] = useState<CourseCatalogItem | null>(null);
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [notes, setNotes] = useState("");
  const [notesError, setNotesError] = useState("");
  const [courseError, setCourseError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const user = getAuthUser();
      const [apps, selected, dashboard] = await Promise.all([
        getRetrainingApplications(),
        courseId ? getRetrainingCourse(courseId) : Promise.resolve(null),
        profileService.getDashboard().catch(() => null),
      ]);
      setItems(apps);
      setCourse(selected);
      const p = dashboard?.profile;
      setProfile({
        fullName:
          [p?.lastName || user?.last_name, p?.firstName || user?.first_name, p?.middleName || user?.father_name]
            .filter(Boolean)
            .join(" ") || "",
        phone: p?.phone || user?.phone_number || "",
        email: p?.email || user?.email || "",
        region: [p?.region, p?.district].filter(Boolean).join(", "),
        education: p?.qualificationDirection || "",
        specialty: p?.specialization || p?.profession || "",
        workplace: p?.workplace || "",
        position: p?.position || "",
      });
      setError(null);
    } catch (caught) {
      if (!silent) setError(caught);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useLiveRefresh(() => void load(true));

  const current = useMemo(
    () => (course ? findRetrainingApplication(items, course) : null),
    [course, items]
  );
  const canApply = canReapplyApplication(current);
  const status = current ? retrainingStatusCard(current.status) : null;

  const submit = async () => {
    setCourseError("");
    setNotesError("");
    if (!course) {
      setCourseError("Kurs tanlanishi shart.");
      return;
    }
    if (!canApply || saving) return;
    setSaving(true);
    try {
      const created = await applyToRetrainingCourse(course, notes);
      setItems((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      toast.success("Ariza yuborildi.");
      setNotes("");
      router.replace("/retraining/applications");
    } catch (caught) {
      toast.error(caught instanceof ApiError ? studentApiErrorMessage(caught) : "Ariza yuborilmadi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} onRetry={() => void load(false)} />;

  return (
    <div className="min-w-0">
      <PageHeader title="Ariza" description="Qayta tayyorlash kursi uchun ariza yuboring." />

      {courseId ? (
        <section className="mb-6 rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
          {!course ? (
            <p className="text-sm text-[#B91C1C]">Tanlangan kurs topilmadi yoki qayta tayyorlash kursi emas.</p>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-wide text-[#64748B] uppercase">Tanlangan kurs</p>
              <h2 className="mt-1 break-words text-lg font-bold text-[#0C2340]">{course.title}</h2>
              {course.description ? <p className="mt-2 text-sm text-[#64748B]">{course.description}</p> : null}
              {status ? (
                <p className={cn("mt-3 inline-flex rounded-xl border px-3 py-1.5 text-sm font-semibold", status.className)}>
                  {status.emoji} {status.label}
                </p>
              ) : null}
              {current && !canApply && status?.kind === "pending" ? (
                <p className="mt-3 text-sm font-medium text-amber-800">Arizangiz ko&apos;rib chiqilmoqda.</p>
              ) : null}
              {current && isApprovedApplicationStatus(current.status) ? (
                <Link
                  href="/retraining/my-courses"
                  className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
                >
                  Mening kurslarim
                </Link>
              ) : null}
              {current && status?.kind === "rejected" ? (
                <p className="mt-3 text-sm text-[#B91C1C]">
                  Rad sababi: {applicationDecisionNote(current) || "Ko'rsatilmagan"}
                </p>
              ) : null}

              {canApply ? (
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  {courseError ? <p className="text-sm text-[#B91C1C]">{courseError}</p> : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {readOnlyField("F.I.Sh.", profile?.fullName || "")}
                    {readOnlyField("Telefon", profile?.phone || "")}
                    {readOnlyField("Email", profile?.email || "")}
                    {profile?.region ? readOnlyField("Hudud", profile.region) : null}
                    {profile?.education ? readOnlyField("Ma'lumoti", profile.education) : null}
                    {profile?.specialty ? readOnlyField("Mutaxassisligi", profile.specialty) : null}
                    {profile?.workplace ? readOnlyField("Ish joyi", profile.workplace) : null}
                    {profile?.position ? readOnlyField("Lavozimi", profile.position) : null}
                  </div>
                  <label className="block text-sm font-medium text-[#0C2340]">
                    Qo&apos;shimcha ma&apos;lumot
                    <textarea
                      value={notes}
                      onChange={(event) => {
                        setNotes(event.target.value);
                        setNotesError("");
                      }}
                      rows={4}
                      className="mt-1 w-full rounded-xl border border-[#E8EDF5] px-3 py-2 text-sm font-normal outline-none focus:border-[#2563EB]"
                      placeholder="Ixtiyoriy izoh"
                    />
                    {notesError ? <span className="mt-1 block text-sm font-normal text-[#B91C1C]">{notesError}</span> : null}
                  </label>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0756F5] text-sm font-semibold text-white disabled:opacity-60 sm:w-auto sm:px-5"
                  >
                    {saving ? "Ariza yuborilmoqda..." : current ? "Qayta ariza berish" : "Ariza yuborish"}
                  </button>
                </form>
              ) : null}
            </>
          )}
        </section>
      ) : (
        <p className="mb-6 rounded-xl border border-[#E8EDF5] bg-white p-4 text-sm text-[#64748B]">
          Ariza yuborish uchun kurslar bo&apos;limidan kursni tanlang.
        </p>
      )}

      <h3 className="mb-3 text-base font-bold text-[#0C2340]">Mening arizalarim</h3>
      {items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Siz hali ariza yubormagansiz."
          description="Qayta tayyorlash kursini tanlab ariza yuboring."
          action={
            <Link
              href="/retraining/courses"
              className="inline-flex min-h-11 items-center rounded-xl bg-[#0756F5] px-4 text-sm font-semibold text-white"
            >
              Kurslarni ko&apos;rish
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const card = retrainingStatusCard(item.status);
            const note = applicationDecisionNote(item);
            return (
              <article key={item.id} className="rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 break-words text-sm font-semibold text-[#0C2340]">{item.title}</h3>
                  <span className={cn("shrink-0 rounded-xl border px-2.5 py-1 text-xs font-semibold", card.className)}>
                    {card.emoji} {card.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-[#94A3B8]">{formatApplicationEvent(item)}</p>
                {note ? <p className="mt-2 break-words text-sm text-[#445574]">{note}</p> : null}
                {card.kind === "approved" ? (
                  <Link href="/retraining/my-courses" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#0756F5]">
                    Mening kurslarim
                  </Link>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
