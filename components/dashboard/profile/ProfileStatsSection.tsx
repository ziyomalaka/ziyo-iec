import StatCard from "@/components/dashboard/ui/StatCard";
import type { ProfileStatsResponse } from "@/lib/api/types/profile";
import { Award, BookOpen, Clock, TrendingUp } from "lucide-react";

type ProfileStatsSectionProps = {
  stats: ProfileStatsResponse | null;
  loading?: boolean;
};

export default function ProfileStatsSection({ stats, loading }: ProfileStatsSectionProps) {
  if (loading && !stats) {
    return (
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-xl border border-[#E8EDF5] bg-white" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard label="Jami kurslar" value={stats.total_courses} icon={BookOpen} />
      <StatCard label="Tugallangan" value={stats.completed_courses} icon={Award} />
      <StatCard label="O'qilgan soat" value={stats.study_hours} icon={Clock} />
      <StatCard label="Sertifikatlar" value={stats.certificates} icon={Award} />
      <StatCard label="O'rtacha natija" value={stats.average_result} suffix="%" icon={TrendingUp} />
    </div>
  );
}
