import { BookOpen, Check, Clock3, Play } from "lucide-react";
import type { DirectionStats } from "@/lib/dashboard/types";

const cards = [
  {
    key: "total",
    title: "Barcha yo'nalishlar",
    subtitle: "Jami yo'nalishlar",
    icon: BookOpen,
    iconWrap: "bg-[#E8F0FF] text-[#0756F5]",
  },
  {
    key: "active",
    title: "Faol yo'nalishlar",
    subtitle: "Davom etayotgan",
    icon: Play,
    iconWrap: "bg-[#E6F8ED] text-[#0AA64F]",
  },
  {
    key: "completed",
    title: "Tugallangan yo'nalishlar",
    subtitle: "Sertifikat olingan",
    icon: Check,
    iconWrap: "bg-[#FFF0DB] text-[#FF8A00]",
  },
  {
    key: "studyHours",
    title: "Jami o'qish vaqti",
    subtitle: "Umumiy",
    icon: Clock3,
    iconWrap: "bg-[#EFEAFF] text-[#5123EA]",
  },
] as const;

type DirectionStatsRowProps = {
  stats: DirectionStats;
};

export default function DirectionStatsRow({ stats }: DirectionStatsRowProps) {
  const values = {
    total: String(stats.total),
    active: String(stats.active),
    completed: String(stats.completed),
    studyHours: `${stats.studyHours} soat`,
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.key}
            className="flex h-[123px] items-center gap-4 rounded-[10px] border border-[#E0E7F1] bg-white px-5"
          >
            <div className={`flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[12px] ${card.iconWrap}`}>
              <Icon className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#41547B]">{card.title}</p>
              <p className="mt-1 text-[28px] leading-none font-bold text-[#101A37]">{values[card.key]}</p>
              <p className="mt-1.5 text-[12px] text-[#41547B]">{card.subtitle}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
