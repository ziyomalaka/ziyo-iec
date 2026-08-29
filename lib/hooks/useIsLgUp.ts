"use client";

import { useEffect, useState } from "react";

/** Tailwind `lg` — 1024px. `null` = hali o'lcham aniqlanmagan. */
export function useIsLgUp() {
  const [lg, setLg] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setLg(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return lg;
}
