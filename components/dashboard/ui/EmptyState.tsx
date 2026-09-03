import { cn } from "@/lib/cn";
import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[#E8EDF5] bg-white px-6 py-16 text-center",
        className
      )}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF4FF] text-[#0756F5] shadow-[0_4px_14px_rgba(7,86,245,0.12)] ring-1 ring-[#D6E4FF]">
        <Icon className="h-8 w-8" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold text-[#0C2340]">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-[#64748B]">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
