import { Suspense } from "react";
import MaterialWizard from "@/components/admin/qualification/wizard/MaterialWizard";
import LoadingState from "@/components/dashboard/ui/LoadingState";

export default function CreateQualificationMaterialPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MaterialWizard />
    </Suspense>
  );
}
