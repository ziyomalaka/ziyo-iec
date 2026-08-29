export function OutlineSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Yuklanmoqda">
      <div className="h-7 w-2/3 animate-pulse rounded-lg bg-[#E8EDF5]" />
      <div className="h-2 w-full animate-pulse rounded-full bg-[#E8EDF5]" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3 rounded-2xl border border-[#E8EDF5] bg-white p-3">
          <div className="h-5 w-40 animate-pulse rounded bg-[#E8EDF5]" />
          <div className="h-16 animate-pulse rounded-2xl bg-[#F1F5F9]" />
          <div className="h-16 animate-pulse rounded-2xl bg-[#F1F5F9]" />
        </div>
      ))}
    </div>
  );
}

export function LessonSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Dars yuklanmoqda">
      <div className="h-5 w-32 animate-pulse rounded bg-[#E8EDF5]" />
      <div className="h-8 w-3/4 animate-pulse rounded-lg bg-[#E8EDF5]" />
      <div className="h-2 w-full animate-pulse rounded-full bg-[#E8EDF5]" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-[#F1F5F9]" />
      ))}
    </div>
  );
}
