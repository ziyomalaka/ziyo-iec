import LearningView from "@/components/dashboard/views/LearningView";

type Props = {
  params: Promise<{ id: string; lessonId: string }>;
};

export default async function MyDirectionLessonPage({ params }: Props) {
  const { id, lessonId } = await params;
  const parsed = Number(lessonId);
  return <LearningView courseId={id} initialLessonId={Number.isFinite(parsed) && parsed > 0 ? parsed : undefined} />;
}
