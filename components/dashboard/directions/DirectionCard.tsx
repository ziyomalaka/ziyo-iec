"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { CalendarDays, Clock3, Languages, LayoutGrid, MoreVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { directionLearningHref } from "@/lib/dashboard/course-application";
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

type DirectionCardProps = {
  direction: MyDirection;
};

export default function DirectionCard({ direction }: DirectionCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const remaining = Math.max(0, direction.totalHours - direction.completedHours);
  const continueHref = directionLearningHref(direction);
  const detailHref = continueHref;
  const actionClass =
    direction.progressColor === "orange"
      ? "bg-[#FF8A00] hover:bg-[#e57c00]"
      : "bg-[#0AA64F] hover:bg-[#099246]";

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <article className="relative flex min-h-[165px] flex-col gap-4 rounded-[10px] border border-[#E0E7F1] bg-white p-[14px_16px] md:flex-row md:items-stretch">
      <div className="relative h-[145px] w-full shrink-0 overflow-hidden rounded-[6px] md:w-[190px]">
        <Image
          src={direction.image}
          alt={direction.title}
          fill
          className="object-cover"
          sizes="190px"
        />
        <span
          className={cn(
            "absolute top-2 left-2 rounded px-2 py-0.5 text-[11px] font-semibold text-white",
            direction.badgeClass
          )}
        >
          {direction.category}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] leading-[1.35] font-bold text-[#101A37]">{direction.title}</h3>
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
          Boshlanishi: {formatDotDate(direction.startDate)}
        </p>
      </div>

      <div className="flex w-full shrink-0 flex-col justify-center md:w-[230px] md:pr-6">
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#41547B]">Kurs davomiyligi</p>
          <p className="text-[20px] font-bold text-[#101A37]">{direction.progress}%</p>
        </div>
        <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#E8EDF5]">
          <div
            className={cn("h-full rounded-full", progressFill[direction.progressColor])}
            style={{ width: `${direction.progress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-[#41547B]">
          <span>Tugallangan: {direction.completedHours} soat</span>
          {direction.status !== "completed" ? <span>Qolgan: {remaining} soat</span> : null}
        </div>

        {direction.status === "completed" ? (
          <span className="mt-3 inline-flex h-[34px] items-center justify-center rounded-lg bg-[#E6F8ED] px-3 text-[12px] font-semibold text-[#0AA64F]">
            Tugallangan
          </span>
        ) : direction.showActions ? (
          <div className="mt-3 flex gap-2">
            <Link
              href={continueHref}
              className={cn(
                "flex h-[34px] flex-1 items-center justify-center rounded-lg text-[12px] font-semibold text-white",
                actionClass
              )}
            >
              Davom ettirish
            </Link>
            <Link
              href={detailHref}
              className="flex h-[34px] flex-1 items-center justify-center rounded-lg border border-[#DCE5F0] bg-white text-[12px] font-semibold text-[#101A37]"
            >
              Kursga o&apos;tish
            </Link>
          </div>
        ) : null}
      </div>

      <div ref={menuRef} className="absolute top-3 right-3">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-[#41547B] hover:bg-[#F7FAFE]"
          aria-label="Menyu"
        >
          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
        </button>
        {menuOpen ? (
          <div className="absolute top-9 right-0 z-20 w-[180px] overflow-hidden rounded-lg border border-[#E0E7F1] bg-white py-1 shadow-[0_8px_24px_rgba(15,35,70,0.12)]">
            <Link
              href={detailHref}
              className="block px-3 py-2 text-[12px] text-[#101A37] hover:bg-[#F7FAFE]"
              onClick={() => setMenuOpen(false)}
            >
              Yo&apos;nalishga o&apos;tish
            </Link>
            <Link
              href={detailHref}
              className="block px-3 py-2 text-[12px] text-[#101A37] hover:bg-[#F7FAFE]"
              onClick={() => setMenuOpen(false)}
            >
              Batafsil
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );
}
