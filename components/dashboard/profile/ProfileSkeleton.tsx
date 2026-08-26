export default function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-[14px]">
      <div className="h-[205px] rounded-[10px] border border-[#DFE7F2] bg-white" />
      <div className="grid grid-cols-1 gap-[14px] sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[98px] rounded-[9px] border border-[#DFE7F2] bg-white" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,47%)_minmax(0,53%)]">
        <div className="space-y-4">
          <div className="h-80 rounded-[9px] border border-[#DFE7F2] bg-white" />
          <div className="h-48 rounded-[9px] border border-[#DFE7F2] bg-white" />
        </div>
        <div className="space-y-4">
          <div className="h-64 rounded-[9px] border border-[#DFE7F2] bg-white" />
          <div className="h-80 rounded-[9px] border border-[#DFE7F2] bg-white" />
        </div>
      </div>
    </div>
  );
}
