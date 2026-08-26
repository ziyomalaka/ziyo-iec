"use client";

import { certificates, mockUser, qualificationTimeline } from "@/lib/dashboard/mock/data";
import { getFullName, mapAuthUserToDashboard } from "@/lib/dashboard/utils";
import { getAuthUser } from "@/lib/auth/session";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import ProgressBar from "@/components/dashboard/ui/ProgressBar";
import { toast } from "sonner";

export default function PortfolioView() {
  const user = mapAuthUserToDashboard(getAuthUser()) ?? mockUser;
  const completion = 75;

  const handleSave = () => {
    toast.success("Portfolio ma'lumotlari saqlandi.");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Portfolio"
        description="Professional elektron portfolio."
        action={
          <button type="button" onClick={handleSave} className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]">
            Portfolio tahrirlash
          </button>
        }
      />

      <div className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-semibold text-[#0C2340]">Portfolio {completion}% to'ldirilgan</p>
        </div>
        <ProgressBar value={completion} className="mt-3" showLabel={false} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#0C2340]">Men haqimda</h3>
          <p className="mt-3 text-sm text-[#64748B]">
            {getFullName(user)} — {user.position}. {user.experienceYears} yillik pedagogik tajribaga ega.
            ZiyoMalaka platformasi orqali malaka oshirish yo'nalishini muntazam o'taydi.
          </p>
        </section>

        <section className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#0C2340]">Ta'lim</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#64748B]">
            <li>Toshkent davlat pedagogika universiteti — Boshlang'ich ta'lim</li>
            <li>Malaka oshirish yo'nalishi — ZiyoMalaka platformasi</li>
          </ul>
        </section>

        <section className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#0C2340]">Ish tajribasi</h3>
          <p className="mt-3 text-sm text-[#64748B]">{user.workplace} — {user.position} ({user.experienceYears} yil)</p>
        </section>

        <section className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#0C2340]">Malaka oshirish</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#64748B]">
            {qualificationTimeline.map((e) => (
              <li key={e.year}>{e.year}: {e.course}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#0C2340]">Sertifikatlar</h3>
          <ul className="mt-3 space-y-2 text-sm text-[#64748B]">
            {certificates.map((c) => (
              <li key={c.id}>{c.courseTitle} — {c.number}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-[#E8EDF5] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-[#0C2340]">Fayllar</h3>
          <div className="mt-4 space-y-2">
            {["Diplom.pdf", "Sertifikat.pdf", "Tavsiyanoma.pdf", "Portfolio_material.pdf"].map((file) => (
              <div key={file} className="flex items-center justify-between rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm">
                <span>{file}</span>
                <button type="button" className="text-[#2563EB] hover:underline">Yuklash</button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
