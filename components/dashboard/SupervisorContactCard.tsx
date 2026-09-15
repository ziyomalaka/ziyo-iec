"use client";

import { MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useStudentProgramPaths } from "@/lib/dashboard/program-context";
import {
  personInitials,
  studentStaffDisplayName,
  studentStaffRoleLabel,
} from "@/lib/dashboard/staff-public-label";
import { useNotifications } from "@/components/dashboard/layout/NotificationsContext";

export default function SupervisorContactCard() {
  const { notifications } = useStudentProgramPaths();
  const { items } = useNotifications();
  const fromStaff = items.find((item) => item.fromAdmin || Boolean(item.senderName));
  const name = studentStaffDisplayName(fromStaff?.senderName);

  return (
    <section className="card card-padding">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Sizning nazoratchingiz</p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-blue text-sm font-bold text-primary">
          {personInitials(name)}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold text-primary-dark">{name}</h3>
          <p className="text-sm text-muted">{studentStaffRoleLabel()}</p>
        </div>
      </div>
      <Link href={notifications} className="btn-primary-sm mt-4 w-full sm:w-auto">
        <MessageCircle className="h-4 w-4" strokeWidth={1.75} />
        Xabar yozish
      </Link>
    </section>
  );
}
