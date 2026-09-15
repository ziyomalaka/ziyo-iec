import { notFound } from "next/navigation";
import RetrainingMaterialUploadPage from "@/components/admin/retraining/RetrainingMaterialUploadPage";
import { isRetrainingPanel, type RetrainingPanel } from "@/lib/retraining/admin-panels";

type PageProps = {
  params: Promise<{ panel: string }>;
};

export default async function RetrainingMaterialUploadRoute({ params }: PageProps) {
  const { panel } = await params;
  if (!isRetrainingPanel(panel)) notFound();
  return <RetrainingMaterialUploadPage panel={panel as RetrainingPanel} />;
}
