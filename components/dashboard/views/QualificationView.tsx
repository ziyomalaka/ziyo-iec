"use client";

import { useState } from "react";
import { toast } from "sonner";
import { certificates, dashboardStats, mockUser, qualificationTimeline } from "@/lib/dashboard/mock/data";
import { formatDate, getFullName, mapAuthUserToDashboard } from "@/lib/dashboard/utils";
import { getAuthUser } from "@/lib/auth/session";
import type { Certificate } from "@/lib/dashboard/types";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import StatCard from "@/components/dashboard/ui/StatCard";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";
import DashboardModal from "@/components/dashboard/ui/DashboardModal";
import CertificateCard from "@/components/dashboard/ui/CertificateCard";
import { Award, BookOpen, Clock, TrendingUp } from "lucide-react";

export default function QualificationView() {
  const user = mapAuthUserToDashboard(getAuthUser()) ?? mockUser;
  const [selected, setSelected] = useState<Certificate | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader title="Mening malakam" description="Malaka oshirish tarixi va berilgan sertifikatlar." />

      <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
        <h3 className="font-bold text-[#0C2340]">{getFullName(user)}</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <p><span className="text-[#64748B]">Mutaxassisligi:</span><br />{user.specialty}</p>
          <p><span className="text-[#64748B]">Ish joyi:</span><br />{user.workplace}</p>
          <p><span className="text-[#64748B]">Lavozimi:</span><br />{user.position}</p>
          <p><span className="text-[#64748B]">Joriy malaka darajasi:</span><br />{user.qualificationLevel}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tugallangan kurslar" value={dashboardStats.completedCourses} icon={BookOpen} />
        <StatCard label="Jami o'qilgan soat" value={312} icon={Clock} />
        <StatCard label="Sertifikatlar" value={certificates.length} icon={Award} />
        <StatCard label="O'rtacha natija" value={dashboardStats.averageScore} suffix="%" icon={TrendingUp} />
      </div>

      <section>
        <div className="mb-4">
          <h3 className="font-bold text-[#0C2340]">Malaka oshirish sertifikatlari</h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Tugatilgan malaka oshirish kurslari bo'yicha berilgan rasmiy sertifikatlar.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onView={() => setSelected(certificate)}
            />
          ))}
        </div>
      </section>

      <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
        <h3 className="font-bold text-[#0C2340]">Malaka rivojlanishi</h3>
        <div className="mt-6 space-y-6 border-l-2 border-[#2563EB]/30 pl-6">
          {qualificationTimeline.map((event) => (
            <div key={event.year} className="relative">
              <span className="absolute -left-[31px] flex h-4 w-4 rounded-full bg-[#2563EB]" />
              <p className="font-bold text-[#0C2340]">{event.year}</p>
              <p className="mt-1 text-sm text-[#64748B]">→ {event.course}</p>
              <p className="text-sm text-[#64748B]">→ Natija: {event.result}</p>
              {event.certificate && <p className="text-sm text-[#2563EB]">→ Sertifikat: {event.certificate}</p>}
              {event.type === "current" && <DashboardBadge className="mt-2">Joriy kurs</DashboardBadge>}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-sm">
        <div className="border-b border-[#E8EDF5] px-6 py-4">
          <h3 className="font-bold text-[#0C2340]">Malaka oshirish tarixi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#F7F9FC] text-left text-[#64748B]">
              <tr>
                <th className="px-4 py-3">Yil</th>
                <th className="px-4 py-3">Kurs</th>
                <th className="px-4 py-3">Natija</th>
                <th className="px-4 py-3">Sertifikat</th>
              </tr>
            </thead>
            <tbody>
              {qualificationTimeline.map((e) => (
                <tr key={e.year} className="border-t border-[#E8EDF5]">
                  <td className="px-4 py-3">{e.year}</td>
                  <td className="px-4 py-3">{e.course}</td>
                  <td className="px-4 py-3">{e.result}</td>
                  <td className="px-4 py-3">{e.certificate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DashboardModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Malaka oshirish sertifikati"
        footer={
          selected ? (
            <button
              type="button"
              onClick={() => toast.success("Sertifikat yuklab olishga tayyorlandi.")}
              className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]"
            >
              Yuklab olish
            </button>
          ) : null
        }
      >
        {selected ? (
          <div className="overflow-hidden rounded-xl border border-[#E8EDF5]">
            <div className="bg-gradient-to-br from-[#0756F5] to-[#043087] px-6 py-8 text-center text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                ZiyoMalaka
              </p>
              <h4 className="mt-2 text-xl font-bold">{selected.title}</h4>
              <p className="mt-4 text-sm text-white/80">Ushbu sertifikat beriladi</p>
              <p className="mt-1 text-lg font-semibold">{getFullName(user)}</p>
            </div>
            <div className="space-y-3 bg-white p-6 text-sm">
              <p>
                <span className="text-[#64748B]">Kurs:</span>{" "}
                <strong className="text-[#0C2340]">{selected.courseTitle}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Sertifikat raqami:</span>{" "}
                <strong className="text-[#0C2340]">{selected.number}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Berilgan sana:</span>{" "}
                <strong className="text-[#0C2340]">{formatDate(selected.issuedAt)}</strong>
              </p>
              <p>
                <span className="text-[#64748B]">Holati:</span>{" "}
                <DashboardBadge variant="success">{selected.status}</DashboardBadge>
              </p>
              <p className="text-[#64748B]">QR: {selected.qrCode}</p>
            </div>
          </div>
        ) : null}
      </DashboardModal>
    </div>
  );
}
