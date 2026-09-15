import RetrainingLearningView from "@/components/retraining/RetrainingLearningView";

type Props = {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
};

export default async function RetrainingLearningCourseLayout({ children, params }: Props) {
  const { courseId } = await params;
  return (
    <>
      <RetrainingLearningView courseId={courseId} />
      {children}
    </>
  );
}
