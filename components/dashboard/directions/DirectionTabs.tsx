import { cn } from "@/lib/cn";

export type DirectionTabId = "all" | "active" | "completed" | "archived";

type DirectionTabsProps = {
  active: DirectionTabId;
  counts: { all: number; active: number; completed: number };
  onChange: (id: DirectionTabId) => void;
};

const tabs: { id: Exclude<DirectionTabId, "archived">; label: string; badge: keyof DirectionTabsProps["counts"]; tone: "blue" | "green" | "navy" }[] = [
  { id: "all", label: "Barcha yo'nalishlar", badge: "all", tone: "blue" },
  { id: "active", label: "Faol yo'nalishlar", badge: "active", tone: "green" },
  { id: "completed", label: "Tugallangan yo'nalishlar", badge: "completed", tone: "navy" },
];

export default function DirectionTabs({ active, counts, onChange }: DirectionTabsProps) {
  return (
    <div className="flex min-w-0 flex-1 items-end gap-6 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 pb-3 text-[14px] font-medium",
              isActive ? "border-[#0756F5] text-[#0756F5]" : "border-transparent text-[#101A37]"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                isActive
                  ? "bg-[#0756F5] text-white"
                  : tab.tone === "green"
                    ? "bg-[#E6F8ED] text-[#0AA64F]"
                    : "bg-[#E8F0FF] text-[#0756F5]"
              )}
            >
              {counts[tab.badge]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
