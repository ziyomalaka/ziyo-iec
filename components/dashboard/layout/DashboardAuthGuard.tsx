"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath, isStaffRole } from "@/lib/auth/roles";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function DashboardAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.replace("/kirish");
      return;
    }

    const role = getAuthUser()?.role;
    if (isStaffRole(role)) {
      router.replace(getPostLoginPath(role));
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F9FC] p-6">
        <div className="w-full max-w-3xl">
          <LoadingState />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
