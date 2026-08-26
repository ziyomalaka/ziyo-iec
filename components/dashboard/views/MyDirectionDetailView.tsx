"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock3, Languages, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";
import type { MyDirection } from "@/lib/dashboard/types";

const progressFill = {
  blue: "bg-[#0756F5]",
  green: "bg-[#0AA64F]",
  orange: "bg-[#FF8A00]",
};

function formatDotDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

export default function MyDirectionDetailView({ direction }: { direction: MyDirection }) {
  const remaining = Math.max(0, direction.totalHours - direction.completedHours);
  const continueHref = direction.continueHref ?? `/dashboard/my-direction/${direction.id}/lessons/${direction.currentLessonId ?? "current"}`;

  return (
    <div className="px-6 py-6">
      <article className="rounded-[10px] border border-[#E0E7F1] bg-white p-6">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="relative h-[180px] w-full overflow-hidden rounded-[8px] md:w-[260px]">
            <Image src={direction.image} alt={direction.title} fill className="object-cover" sizes="260px" />
            <span className={cn("absolute top-2 left-2 rounded px-2 py-0.5 text-[11px] font-semibold text-white", direction.badgeClass)}>
              {direction.category}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[22px] font-bold text-[#101A37]">{direction.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#41547B]">
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4 text-[#0756F5]" /> {direction.totalHours} soat
              </span>
              <span className="inline-flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4 text-[#0756F5]" /> {direction.modules} modul
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-4 w-4 text-[#0756F5]" /> {direction.language}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-[#0756F5]" /> Boshlanishi: {formatDotDate(direction.startDate)}
              </span>
            </div>
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[#41547B]">Kurs davomiyligi</p>
                <p className="text-[20px] font-bold text-[#101A37]">{direction.progress}%</p>
              </div>
              <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#E8EDF5]">
                <div className={cn("h-full rounded-full", progressFill[direction.progressColor])} style={{ width: `${direction.progress}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[12px] text-[#41547B]">
                <span>Tugallangan: {direction.completedHours} soat</span>
                {direction.status !== "completed" ? <span>Qolgan: {remaining} soat</span> : null}
              </div>
            </div>
            {direction.status !== "completed" ? (
              <Link
                href={continueHref}
                className="mt-5 inline-flex h-[40px] items-center justify-center rounded-lg bg-[#0756F5] px-5 text-[13px] font-semibold text-white"
              >
                Davom ettirish
              </Link>
            ) : (
              <span className="mt-5 inline-flex h-[34px] items-center justify-center rounded-lg bg-[#E6F8ED] px-3 text-[12px] font-semibold text-[#0AA64F]">
                Tugallangan
              </span>
            )}
          </div>
        </div>
      </article>
    </div>
  );
}
