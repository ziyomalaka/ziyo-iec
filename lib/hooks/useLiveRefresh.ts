"use client";

import { useEffect, useRef } from "react";
import {
  subscribeLiveRefresh,
  type LiveRefreshReason,
} from "@/lib/live/refresh-bus";

type LiveRefreshOptions = {
  skipTick?: boolean;
};

export function useLiveRefresh(
  reload: (reason: LiveRefreshReason) => void | Promise<void>,
  options?: LiveRefreshOptions
) {
  const reloadRef = useRef(reload);
  const optionsRef = useRef(options);
  const inflight = useRef(false);

  reloadRef.current = reload;
  optionsRef.current = options;

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeLiveRefresh((reason) => {
      if (!active) return;
      if (reason === "tick" && optionsRef.current?.skipTick) return;
      if (inflight.current) return;
      inflight.current = true;
      void Promise.resolve(reloadRef.current(reason)).finally(() => {
        inflight.current = false;
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
}
