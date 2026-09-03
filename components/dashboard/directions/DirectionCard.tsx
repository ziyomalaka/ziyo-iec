"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock3, Languages, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/cn";
import { directionLearningHref } from "@/lib/dashboard/course-application";
import type { MyDirection } from "@/lib/dashboard/types";

const progressFill = {
  blue: "bg-[#0756F5]",
  green: "bg-[#0AA64F]",
  orange: "bg-[#FF8A00]",
};

function formatDotDate(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}.${match[2]}.${match[1]}`;
}

type DirectionCardProps = {
  direction: MyDirection;
};

export default function DirectionCard({ direction }: DirectionCardProps) {
  const continueHref = directionLearningHref(direction);

  return (
    <article className="relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-xl border border-[#E8EDF5] bg-white p-4 shadow-[0_2px_12px_rgba(15,35,64,0.04)] md:flex-row md:items-stretch">
      <div className="relative h-[145px] w-full shrink-0 overflow-hidden rounded-xl md:w-[190px]">
        <Image
          src={direction.image}
          alt={direction.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 190px"
        />
        <span
          className={cn(
            "absolute top-2 left-2 rounded-md px-2 py-0.5 text-[11px] font-semibold text-white",
            direction.badgeClass
          )}
        >
          {direction.category}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="break-words text-[17px] leading-[1.35] font-bold text-[#101A37]">{direction.title}</h3>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#41547B]">
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {direction.totalHours} soat
          </span>
          <span className="text-[#C5CEDB]">|</span>
          <span className="inline-flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {direction.modules} modul
          </span>
          <span className="text-[#C5CEDB]">|</span>
          <span className="inline-flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
            {direction.language}
          </span>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#41547B]">
          <CalendarDays className="h-3.5 w-3.5 text-[#0756F5]" strokeWidth={1.75} />
          {direction.startDate ? `Boshlanishi: ${formatDotDate(direction.startDate)}` : "Boshlanish sanasi kutilmoqda"}
        </p>
        {direction.currentLessonTitle ? (
          <p className="mt-3 break-words text-[13px] font-medium text-[#0C2340]">
            Hozirgi dars: {direction.currentLessonTitle}
          </p>
        ) : null}
        {direction.moduleTitles?.length ? (
          <ul className="mt-3 space-y-1 text-[12px] leading-snug text-[#41547B]">
            {direction.moduleTitles.slice(0, 4).map((title) => (
              <li key={title} className="break-words">
                • {title}
              </li>
            ))}
            {direction.moduleTitles.length > 4 ? (
              <li className="text-[#64748B]">yana {direction.moduleTitles.length - 4} ta modul</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="flex w-full shrink-0 flex-col justify-center md:w-[230px]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] text-[#41547B]">O&apos;quv progress</p>
          <p className="text-[20px] font-bold text-[#101A37]">{direction.progress}%</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
          <div
            className={cn("h-full rounded-full", progressFill[direction.progressColor])}
            style={{ width: `${direction.progress}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-[#41547B]">
          {direction.totalLessons
            ? `Yakunlangan darslar: ${direction.completedLessons ?? 0} / ${direction.totalLessons}`
            : `Tugallangan: ${direction.completedHours} soat`}
        </p>

        {direction.status === "completed" ? (
          <span className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#E6F8ED] px-3 text-[13px] font-semibold text-[#0AA64F]">
            Tugallangan
          </span>
        ) : direction.showActions ? (
          <Link
            href={continueHref}
            className="mt-3 flex min-h-11 w-full items-center justify-center rounded-xl bg-[#0756F5] text-[13px] font-semibold text-white"
          >
            Darsni davom ettirish
          </Link>
        ) : null}
      </div>
    </article>
  );
}
