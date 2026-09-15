"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import PageHeader from "@/components/dashboard/ui/PageHeader";
import { RETRAINING_PANEL_LIST } from "@/lib/retraining/admin-panels";

export default function RetrainingHubPage() {
  return (
    <div>
      <PageHeader
        title="Qayta tayyorlash"
        description="Umumiy, pedagogik va kasbiy qayta tayyorlash yo'nalishlarini boshqaring"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RETRAINING_PANEL_LIST.map((panel) => (
          <div
            key={panel.slug}
            className="flex min-h-[220px] flex-col rounded-2xl border border-[#E8EDF5] bg-white p-6 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[#0756F5]">{panel.shortLabel}</p>
            <h2 className="mt-2 text-lg font-bold text-[#0C2340]">{panel.label}</h2>
            <p className="mt-2 flex-1 text-sm text-[#64748B]">Yo&apos;nalish → Modul → Dars → Material → Test</p>
            <Link
              href={panel.route}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#0756F5] px-4 py-2 text-sm font-medium text-white"
            >
              Kirish
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
