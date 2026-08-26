"use client";

import { Toaster } from "sonner";
import LiveRefreshRoot from "@/components/live/LiveRefreshRoot";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LiveRefreshRoot />
      {children}
      <Toaster
        position="top-center"
        richColors
        closeButton
        toastOptions={{
          classNames: {
            toast: "font-sans",
          },
        }}
      />
    </>
  );
}
