"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ProtectedShellProps = {
  children: ReactNode;
  className?: string;
};

function block(event: { preventDefault: () => void }) {
  event.preventDefault();
}

export default function ProtectedShell({ children, className }: ProtectedShellProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "s") event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={cn("select-none", className)} onContextMenu={block} onDragStart={block}>
      {children}
    </div>
  );
}
