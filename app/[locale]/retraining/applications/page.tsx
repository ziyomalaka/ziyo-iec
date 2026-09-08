import { Suspense } from "react";
import RetrainingApplicationsView from "@/components/retraining/RetrainingApplicationsView";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function RetrainingApplicationsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RetrainingApplicationsView />
    </Suspense>
  );
}
