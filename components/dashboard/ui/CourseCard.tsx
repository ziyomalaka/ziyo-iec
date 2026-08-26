import { Link } from "@/i18n/navigation";
import { Clock, Star, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import type { CourseCatalogItem } from "@/lib/dashboard/types";
import DashboardBadge from "./DashboardBadge";

type CourseCardProps = {
  course: CourseCatalogItem;
  className?: string;
};

export default function CourseCard({ course, className }: CourseCardProps) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[#E8EDF5] bg-white shadow-[0_2px_12px_rgba(15,35,64,0.04)] transition-shadow hover:shadow-md", className)}>
      <div className={cn("h-36 bg-gradient-to-br", course.imageGradient)} />
      <div className="p-5">
        <DashboardBadge className="mb-2">{course.direction}</DashboardBadge>
        <h3 className="text-base font-bold leading-snug text-[#0C2340]">{course.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-[#64748B]">{course.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-[#64748B]">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{course.hours} soat</span>
          <span>{course.modulesCount} modul</span>
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{course.studentsCount}</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{course.rating}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#E8EDF5] pt-4">
          <div>
            {course.hasCertificate && (
              <p className="text-xs text-emerald-600">Sertifikat beriladi</p>
            )}
          </div>
          <Link
            href={`/dashboard/courses/${course.id}`}
            className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-[#3B82F6]"
          >
            Batafsil
          </Link>
        </div>
      </div>
    </div>
  );
}
