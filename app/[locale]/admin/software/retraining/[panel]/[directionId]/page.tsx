import { notFound } from "next/navigation";
import RetrainingDirectionDetailPage from "@/components/admin/retraining/RetrainingDirectionDetailPage";
import { isRetrainingPanel, type RetrainingPanel } from "@/lib/retraining/admin-panels";

type PageProps = {
  params: Promise<{ panel: string; directionId: string }>;
};

export default async function RetrainingDirectionPage({ params }: PageProps) {
  const { panel, directionId } = await params;
  if (!isRetrainingPanel(panel)) notFound();
  const id = Number(directionId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return <RetrainingDirectionDetailPage panel={panel as RetrainingPanel} directionId={id} />;
}
