export type LiveRefreshReason = "tick" | "mutation" | "focus";

type Listener = (reason: LiveRefreshReason) => void;

const EVENT = "ziyomalaka:live-refresh";
const CHANNEL = "ziyomalaka-live-refresh";
const SNAPSHOT_KEY = "zm_mandatory_snapshot";
const QUAL_SNAPSHOT_KEY = "zm_qualification_snapshot";
const TICK_MS = 8_000;

const listeners = new Set<Listener>();

let tickerStarted = false;
let channel: BroadcastChannel | null = null;

function notify(reason: LiveRefreshReason) {
  for (const listener of listeners) {
    try {
      listener(reason);
    } catch {
      /* bitta panel xatosi qolganlarini to'xtatmasin */
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: reason }));
  }
}

export function requestLiveRefresh(reason: LiveRefreshReason = "mutation", broadcast = reason === "mutation") {
  notify(reason);

  if (broadcast && channel) {
    try {
      channel.postMessage({ reason });
    } catch {
      channel = null;
    }
  }
}

export function subscribeLiveRefresh(listener: Listener) {
  listeners.add(listener);
  ensureLiveRefreshTicker();
  return () => {
    listeners.delete(listener);
  };
}

export function ensureLiveRefreshTicker() {
  if (typeof window === "undefined" || tickerStarted) return;
  tickerStarted = true;

  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = () => {
      notify("mutation");
    };
  } catch {
    channel = null;
  }

  const onFocus = () => {
    if (document.visibilityState === "hidden") return;
    if (listeners.size === 0) return;
    requestLiveRefresh("focus", false);
  };

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") onFocus();
  });

  window.addEventListener("storage", (event) => {
    if (event.key && event.key !== SNAPSHOT_KEY && event.key !== QUAL_SNAPSHOT_KEY) return;
    if (listeners.size === 0) return;
    // Snapshot yozuvi mutation emas — aks holda admin list↔detail loop.
    requestLiveRefresh("tick", false);
  });

  window.setInterval(() => {
    if (document.visibilityState === "hidden") return;
    if (listeners.size === 0) return;
    requestLiveRefresh("tick", false);
  }, TICK_MS);
}
