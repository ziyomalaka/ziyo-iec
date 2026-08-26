import LearningView from "@/components/dashboard/views/LearningView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MyDirectionPage({ params }: Props) {
  const { id } = await params;
  return <LearningView courseId={id} />;
}
