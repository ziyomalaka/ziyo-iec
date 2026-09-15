import { notFound } from "next/navigation";
import RetrainingLessonDetailPage from "@/components/admin/retraining/RetrainingLessonDetailPage";
import { isRetrainingPanel, type RetrainingPanel } from "@/lib/retraining/admin-panels";

type PageProps = {
  params: Promise<{
    panel: string;
    directionId: string;
    moduleId: string;
    lessonId: string;
  }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export default async function RetrainingLessonPage({ params }: PageProps) {
  const { panel, directionId, moduleId, lessonId } = await params;
  if (!isRetrainingPanel(panel)) notFound();

  const direction = parseId(directionId);
  const module = parseId(moduleId);
  const lesson = parseId(lessonId);
  if (!direction || !module || !lesson) notFound();

  return (
    <RetrainingLessonDetailPage
      panel={panel as RetrainingPanel}
      directionId={direction}
      moduleId={module}
      lessonId={lesson}
    />
  );
}
