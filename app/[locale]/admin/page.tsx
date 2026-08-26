"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getPostLoginPath } from "@/lib/auth/roles";

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getPostLoginPath(getAuthUser()?.role));
  }, [router]);

  return null;
}
