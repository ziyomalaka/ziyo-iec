import RetrainingCourseDetailLoader from "@/components/retraining/RetrainingCourseDetailLoader";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RetrainingKindCourseDetailPage({ params }: Props) {
  const { id } = await params;
  return <RetrainingCourseDetailLoader id={id} />;
}
