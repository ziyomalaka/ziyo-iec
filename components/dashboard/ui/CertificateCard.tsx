"use client";

import { Award, Calendar, Hash } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/dashboard/utils";
import type { Certificate } from "@/lib/dashboard/types";
import DashboardBadge from "@/components/dashboard/ui/DashboardBadge";

type CertificateCardProps = {
  certificate: Certificate;
  onView: () => void;
  className?: string;
};

export default function CertificateCard({ certificate, onView, className }: CertificateCardProps) {
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-[0_2px_12px_rgba(15,35,64,0.04)]",
        className
      )}
    >
      <div className="relative bg-gradient-to-br from-[#0756F5] to-[#043087] px-5 py-6 text-white">
        <Award className="absolute right-4 top-4 h-10 w-10 opacity-20" />
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
          ZiyoMalaka
        </p>
        <h3 className="mt-2 text-base font-bold leading-snug">{certificate.title}</h3>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm font-semibold text-[#0C2340]">{certificate.courseTitle}</p>
        <div className="mt-3 space-y-2 text-sm text-[#64748B]">
          <p className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-[#0756F5]" />
            {certificate.number}
          </p>
          <p className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#0756F5]" />
            {formatDate(certificate.issuedAt)}
          </p>
        </div>
        <div className="mt-4">
          <DashboardBadge variant="success">{certificate.status}</DashboardBadge>
        </div>
        <button
          type="button"
          onClick={onView}
          className="mt-auto flex h-10 w-full items-center justify-center rounded-lg border border-[#d9e3f0] bg-white text-[13px] font-semibold text-[#0756F5] hover:bg-[#F7F9FC]"
        >
          Sertifikatni ko'rish
        </button>
      </div>
    </article>
  );
}
