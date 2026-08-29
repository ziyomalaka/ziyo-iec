import LearningView from "@/components/dashboard/views/LearningView";

type Props = {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
};

export default async function LearningCourseLayout({ children, params }: Props) {
  const { courseId } = await params;
  return (
    <>
      <LearningView courseId={courseId} />
      {children}
    </>
  );
}
