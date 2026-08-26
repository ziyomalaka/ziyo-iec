import { Suspense } from "react";
import SupervisorView from "@/components/admin/views/SupervisorView";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function AdminSupervisorPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SupervisorView />
    </Suspense>
  );
}
