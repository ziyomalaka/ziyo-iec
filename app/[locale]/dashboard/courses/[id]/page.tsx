import CourseDetailLoader from "@/components/dashboard/views/CourseDetailLoader";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CourseDetailPage({ params }: Props) {
  const { id } = await params;
  return <CourseDetailLoader id={id} />;
}
