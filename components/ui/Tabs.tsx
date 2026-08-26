"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";

type TabItem = {
  value: string;
  label: string;
  content: React.ReactNode;
};

type TabsProps = {
  items: TabItem[];
  defaultValue?: string;
  className?: string;
  listClassName?: string;
  orientation?: "horizontal" | "vertical";
};

export default function Tabs({
  items,
  defaultValue,
  className,
  listClassName,
  orientation = "horizontal",
}: TabsProps) {
  const isVertical = orientation === "vertical";

  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue ?? items[0]?.value}
      orientation={orientation}
      className={cn(
        isVertical && "grid gap-6 lg:grid-cols-[240px_1fr]",
        className
      )}
    >
      <TabsPrimitive.List
        className={cn(
          isVertical
            ? "flex flex-col space-y-1"
            : "mb-4 flex rounded-lg bg-surface p-1",
          listClassName
        )}
      >
        {items.map((item) => (
          <TabsPrimitive.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors",
              isVertical
                ? "border border-border bg-white text-muted hover:border-primary hover:text-primary data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white"
                : "flex-1 rounded-md px-3 py-2 text-center text-muted data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm hover:text-slate-900"
            )}
          >
            {item.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {items.map((item) => (
        <TabsPrimitive.Content key={item.value} value={item.value}>
          {item.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
