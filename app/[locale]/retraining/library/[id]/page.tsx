import LibraryDetailView from "@/components/dashboard/library/LibraryDetailView";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function RetrainingLibraryDetailPage({ params }: Props) {
  const { id } = await params;
  return <LibraryDetailView id={id} />;
}
