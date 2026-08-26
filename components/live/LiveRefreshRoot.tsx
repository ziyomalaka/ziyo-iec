"use client";

import { useEffect } from "react";
import { ensureLiveRefreshTicker } from "@/lib/live/refresh-bus";

export default function LiveRefreshRoot() {
  useEffect(() => {
    ensureLiveRefreshTicker();
  }, []);

  return null;
}
