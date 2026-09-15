import { notFound } from "next/navigation";
import RetrainingPanelListPage from "@/components/admin/retraining/RetrainingPanelListPage";
import { isRetrainingPanel, type RetrainingPanel } from "@/lib/retraining/admin-panels";

type PageProps = {
  params: Promise<{ panel: string }>;
};

export default async function RetrainingPanelPage({ params }: PageProps) {
  const { panel } = await params;
  if (!isRetrainingPanel(panel)) notFound();
  return <RetrainingPanelListPage panel={panel as RetrainingPanel} />;
}
