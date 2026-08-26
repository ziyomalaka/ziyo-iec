import LearningView from "@/components/dashboard/views/LearningView";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function LearningCoursePage({ params }: Props) {
  const { courseId } = await params;
  return <LearningView courseId={courseId} />;
}
