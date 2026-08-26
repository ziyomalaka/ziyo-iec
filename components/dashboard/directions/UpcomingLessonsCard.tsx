import { Link } from "@/i18n/navigation";
import { Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { parseDashboardCourseId } from "@/lib/dashboard/course-application";
import type { UpcomingLesson } from "@/lib/dashboard/types";

const tones = {
  purple: "bg-[#EFEAFF] text-[#5123EA]",
  green: "bg-[#E6F8ED] text-[#0AA64F]",
  blue: "bg-[#E8F0FF] text-[#0756F5]",
};

function formatLessonWhen(lesson: UpcomingLesson) {
  if (lesson.date === "today") return `Bugun, ${lesson.time}`;
  const [year, month, day] = lesson.date.split("-");
  return `${day}.${month}.${year}, ${lesson.time}`;
}

type UpcomingLessonsCardProps = {
  lessons: UpcomingLesson[];
};

export default function UpcomingLessonsCard({ lessons }: UpcomingLessonsCardProps) {
  return (
    <section className="rounded-[10px] border border-[#E0E7F1] bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[16px] font-bold text-[#101A37]">Yaqin darslar</h3>
        <Link href="/dashboard/learning" className="text-[12px] font-medium text-[#0756F5]">
          Barchasini ko&apos;rish
        </Link>
      </div>

      <div className="mt-2">
        {lessons.length === 0 ? (
          <p className="py-3 text-[13px] text-[#41547B]">Hali dars yuklanmagan.</p>
        ) : (
          lessons.map((lesson, index) => (
          <div
            key={lesson.id}
            className={cn("flex items-start gap-3 py-3", index < lessons.length - 1 && "border-b border-[#E8EDF5]")}
          >
            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tones[lesson.tone])}>
              <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-[#101A37]">{lesson.directionTitle}</p>
              <p className="mt-0.5 truncate text-[12px] text-[#41547B]">{lesson.moduleTitle}</p>
              <p className="mt-0.5 text-[11px] text-[#41547B]">{formatLessonWhen(lesson)}</p>
            </div>
            <Link
              href={
                lesson.href ??
                `/dashboard/learning/${parseDashboardCourseId(lesson.directionId) ?? lesson.directionId}`
              }
              className="shrink-0 pt-1 text-[12px] font-medium text-[#0756F5]"
            >
              Davom etish
            </Link>
          </div>
          ))
        )}
      </div>
    </section>
  );
}
