"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath } from "@/lib/auth/roles";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    const user = getAuthUser();
    router.replace(getPostLoginPath(user?.role, user?.program_type, user?.retraining_type));
  }, [router]);

  return null;
}
