import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  suffix?: string;
  className?: string;
};

export default function StatCard({ label, value, icon: Icon, suffix, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-[#E8EDF5] bg-white p-5 shadow-[0_2px_12px_rgba(15,35,64,0.04)]", className)}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#2563EB]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-[#0C2340]">
        {value}
        {suffix && <span className="text-lg">{suffix}</span>}
      </div>
      <p className="mt-1 text-sm text-[#64748B]">{label}</p>
    </div>
  );
}
