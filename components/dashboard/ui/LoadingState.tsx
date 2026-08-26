import { cn } from "@/lib/cn";

export default function LoadingState({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-[#E8EDF5]" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-[#E8EDF5]" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-[#E8EDF5]" />
    </div>
  );
}
