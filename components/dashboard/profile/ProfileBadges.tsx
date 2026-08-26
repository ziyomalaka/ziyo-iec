import { cn } from "@/lib/cn";

export function VerifiedBadge({ verified }: { verified: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[5px] px-[7px] py-1 text-[9px] font-medium",
        verified ? "bg-[#E7F7EC] text-[#2D9951]" : "bg-[#FFF4E5] text-[#C27803]"
      )}
    >
      {verified ? "Tasdiqlangan ✓" : "Tasdiqlanmagan"}
    </span>
  );
}

export function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[5px] border border-[#C9DDFE] bg-[#EEF5FF] px-2 py-0.5 text-[11px] font-medium text-[#0756F5]">
      {children}
    </span>
  );
}

export function SessionBadge() {
  return (
    <span className="inline-flex items-center rounded-[5px] bg-[#E7F7EC] px-2 py-1 text-[9px] font-medium text-[#2A924A]">
      Joriy sessiya
    </span>
  );
}
