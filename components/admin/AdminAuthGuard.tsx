"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { getAuthToken, getAuthUser } from "@/lib/auth/session";
import {
  canAccessIt,
  canAccessManagement,
  canAccessSupervisor,
  getPostLoginPath,
  isStaffRole,
} from "@/lib/auth/roles";
import LoadingState from "@/components/dashboard/ui/LoadingState";

function canAccessPath(pathname: string, role?: string | null) {
  if (pathname.startsWith("/admin/software")) return canAccessIt(role);
  if (pathname.startsWith("/admin/supervisor")) return canAccessSupervisor(role);
  if (pathname.startsWith("/admin/management")) return canAccessManagement(role);
  return isStaffRole(role);
}

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    const token = getAuthToken();
    if (!token) {
      router.replace("/kirish");
      return;
    }

    const user = getAuthUser();
    const role = user?.role;
    if (!canAccessPath(pathname, role)) {
      // Student bo'lsa: dasturi bo'yicha panelga, program_type bo'sh bo'lsa tanlash sahifasiga.
      router.replace(getPostLoginPath(role, user?.program_type));
      return;
    }

    setReady(true);
  }, [pathname, router]);

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
