import { cn } from "@/lib/cn";

type ProgressBarProps = {
  value: number;
  className?: string;
  showLabel?: boolean;
};

export default function ProgressBar({ value, className, showLabel = true }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-[#64748B]">Progress</span>
          <span className="font-semibold text-[#2563EB]">{clamped}%</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full bg-[#E8EDF5]">
        <div
          className="h-full rounded-full bg-[#2563EB] transition-all duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
